// Moldura isolada do painel de IA. Roda num iframe com sandbox="allow-scripts" (origem opaca) e não usa nada do app Angular.
// Protocolo com a janela pai (mensagens {wk: 2, type, ...}):
// - moldura -> pai: frame-ready {protocols: [2]}, quando esta página carregou; protocols lista os protocolos que a moldura entende, para o
//   pai recusar uma moldura desatualizada (em cache) que não entenda o dele;
// - pai -> moldura: render {html, params, datasets: [{name, title, params}], libsBaseUrl, locale, theme}, sem dados, uma única vez por
//   carga;
// - moldura -> pai: csp-violation {directive}, quando a CSP do servidor web bloqueia script inline (configuração do Apache desatualizada);
// - moldura -> pai: error {code: 'unknown-library', message}, para cada wk-lib:<id> desconhecida;
// - as demais mensagens são as do script ponte (panelBridge), descritas nele.
// O document.open() apaga os ouvintes deste arquivo: depois dele, todo o protocolo fica no script ponte, injetado no início do <head> do
// documento escrito, antes dos scripts da página.
(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        api.start(root);
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const PANEL_PROTOCOL_VERSION = 2;
    const SUPPORTED_PROTOCOLS = [PANEL_PROTOCOL_VERSION];

    // Deve acompanhar TAiPanelContract.GetLibraries (serverapps\common\Wk.AiPanel.Contract.pas) e os assets do angular.json; o teste
    // unitário Delphi LibrariesInWebClient confere as três listas
    const LIBRARIES = {
        'chartjs': 'chartjs@4.6.1/chart.umd.min.js',
        'echarts': 'echarts@5.6.0/echarts.min.js',
        'd3': 'd3@7.9.0/d3.min.js',
        'html-to-image': 'html-to-image@1.11.13/html-to-image.js'
    };

    // A mesma política do cabeçalho do Apache (<LocationMatch "^/assets/artifact-frame/">), sem frame-ancestors e sandbox, que o <meta>
    // não aceita. Repetida no documento escrito para o caso de um navegador não manter a política da página depois do document.open()
    const CONTENT_SECURITY_POLICY = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";

    // src="wk-lib:<id>", src='wk-lib:<id>' ou src=wk-lib:<id>
    const LIBRARY_SOURCE_PATTERN = /(\bsrc\s*=\s*)(?:(["'])wk-lib:([^"']*)\2|wk-lib:([^\s"'>]+))/gi;

    const HEAD_PATTERN = /<head(?:\s[^>]*)?>/i;
    const HTML_PATTERN = /<html(?:\s[^>]*)?>/i;
    const DOCTYPE_PATTERN = /^\s*<!doctype[^>]*>/i;

    function isObject (value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    // JSON que pode ficar dentro de um <script>: com o < escapado, o conteúdo nunca fecha o bloco (</script>) nem abre um comentário (<!--)
    function toScriptJson (value) {
        return JSON.stringify(value === undefined ? null : value).replace(/</g, '\\u003c');
    }

    // Valida a mensagem render do painel de IA (protocolo 2) e devolve o payload normalizado, ou null quando ela não é um render válido
    function parsePanelRenderMessage (data) {
        if (!isObject(data) || data.wk !== PANEL_PROTOCOL_VERSION || data.type !== 'render' || typeof data.html !== 'string') {
            return null;
        }

        return {
            html: data.html,
            params: Array.isArray(data.params) ? data.params.filter(function (item) {
                return isObject(item) && typeof item.name === 'string';
            }) : [],
            datasets: Array.isArray(data.datasets) ? data.datasets.filter(function (item) {
                return isObject(item) && typeof item.name === 'string';
            }) : [],
            libsBaseUrl: typeof data.libsBaseUrl === 'string' ? data.libsBaseUrl : '',
            locale: typeof data.locale === 'string' ? data.locale : '',
            theme: data.theme === 'dark' ? 'dark' : 'light'
        };
    }

    function librariesBaseUrl (libsBaseUrl) {
        return libsBaseUrl && libsBaseUrl.charAt(libsBaseUrl.length - 1) !== '/' ? libsBaseUrl + '/' : libsBaseUrl;
    }

    // Troca wk-lib:<id> pela URL local da biblioteca. Uma biblioteca desconhecida fica como está (o navegador não carrega o esquema
    // wk-lib:) e é devolvida em unknownLibraries
    function replaceLibraries (html, libsBaseUrl) {
        const unknownLibraries = [];
        const baseUrl = librariesBaseUrl(libsBaseUrl);

        const result = html.replace(LIBRARY_SOURCE_PATTERN, function (match, prefix, quote, quotedId, unquotedId) {
            const id = quote ? quotedId : unquotedId;

            if (!Object.prototype.hasOwnProperty.call(LIBRARIES, id)) {
                if (unknownLibraries.indexOf(id) < 0) {
                    unknownLibraries.push(id);
                }

                return match;
            }

            return prefix + '"' + baseUrl + LIBRARIES[id] + '"';
        });

        return { html: result, unknownLibraries: unknownLibraries };
    }

    // Script ponte do painel de IA (protocolo 2). Roda dentro do documento da página, antes dos scripts dela, e expõe window.weknow
    // (versão 1 da API, congelada; window.dash é um apelido), com os nomes e o comportamento do dash do tipo Dashboard do Claude:
    // - data(id): estado de um conjunto ou de um calc, {status, data, columns, meta, refreshing, message}; a primeira leitura de um conjunto
    //   dispara o pedido ao pai. status: loading, ok, empty ou error; data é sempre uma lista (vazia até chegar o dado);
    // - onData(fn): roda fn já (ou quando o DOM fica pronto) e de novo a cada dado novo, a cada mudança de parâmetro e de largura;
    // - calc(id, {inputs, fn, title, description}): valor derivado no navegador, recalculado só quando uma entrada muda;
    // - params(), setParams(valores), resetParams(): parâmetros da página, com as regras de TAiPanelParams (Wk.AiPanel.Params.pas);
    // - colors (oito cores de série do tema), refresh(id?), version, locale e theme; loader e setLink não existem e lançam um erro.
    // Marcas: data-source (conjunto ou calc) com data-field, data-row (índice) ou data-where (objeto JSON ou campo=valor;...) numa célula,
    // só data-source num gráfico, e data-source + data-row-key numa tabela (com data-field nos <th>); data-fetchpriority (high, auto, low)
    // ordena os pedidos. A ponte aplica data-dash-source-state (loading, refreshing, error, empty) nas marcas e data-dash-state (loading,
    // refreshing, ready) na raiz.
    // Mensagens para o pai: params-changed {params}, data-request {name, id, params, priority}, marks {list}, calc {id, title, description,
    // inputs, fn, status, message, refreshing, data, columns, rowCount}, calc-error {id, message}, mark-click {source, field, row}, check
    // {check}, settled, error {code, message}, rendered, pong {id} e snapshot-result {id, status, dataUrl, width, height, message}. Do pai:
    // data-response {name, id, status, data, columns, meta, message}, refresh {name?}, ping {id} e snapshot {id}, que pede a imagem PNG do
    // documento no tamanho da moldura (exportação: o pai não alcança o conteúdo de um iframe de origem opaca).
    // É serializado com toString, então não pode usar nada de fora da própria função. Devolve partes internas, usadas pelos testes
    function panelBridge (config, win) {
        'use strict';

        const doc = win.document;
        const parentWindow = win.parent;
        const EMPTY = Object.freeze([]);
        const NO_META = Object.freeze({});
        const FINAL_STATUS = { ok: true, empty: true, error: true };
        const PRIORITY_ORDER = { high: 0, auto: 1, low: 2 };
        const DEFAULT_MAX_ITEMS = 1000;
        const CALC_PREVIEW_ROWS = 200;
        const MAX_ISSUES = 200;
        const MAX_TEXT = 200;
        // escalas aceitas entre o número exibido e o dado: igual, percentual e abreviações (mil, mi, bi, tri)
        const NUMBER_SCALES = [1, 100, 1e-3, 1e-6, 1e-9, 1e-12];
        const COLORS = {
            light: ['#2f6fdb', '#f28e2b', '#3c9a4e', '#d64550', '#7e57c2', '#1597a5', '#c9930a', '#6b7a86'],
            dark: ['#7aa7ff', '#ffab5e', '#7fcf73', '#ff8a8f', '#b39dff', '#4fd1de', '#f2c94c', '#aab6c0']
        };
        const VALUE_TYPE_NAMES = { string: 'texto', number: 'número', boolean: 'lógico (true ou false)', date: 'data ISO 8601 (AAAA-MM-DD)' };
        const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?)?$/;
        const DATE_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T|$)/;
        const NAN_PATTERN = /\bNaN\b|\bInfinity\b/;
        const SHOWN_NUMBER_PATTERN = /[-−]?\d[\d.,\s  ]*/;
        const IGNORED_TEXT_PARENTS = { SCRIPT: true, STYLE: true, TEMPLATE: true, NOSCRIPT: true };
        const STATE_STYLE =
            ':where([data-dash-source-state="loading"]){opacity:.45;animation:wk-dash-pulse 1.2s ease-in-out infinite}' +
            ':where([data-dash-source-state="refreshing"]){opacity:.7;transition:opacity .2s}' +
            ':where([data-dash-source-state="error"]){opacity:.4;outline:1px dashed #c0392b;outline-offset:2px}' +
            ':where([data-dash-source-state="empty"]){opacity:.6}' +
            '@keyframes wk-dash-pulse{0%,100%{opacity:.35}50%{opacity:.6}}' +
            '@media (prefers-reduced-motion:reduce){:where([data-dash-source-state="loading"]){animation:none}}';
        const COLOR_SCHEME_FEATURE = /(prefers-color-scheme\s*:\s*)(dark|light)\b/gi;

        const paramDefs = {};
        const values = {};
        const datasets = {};
        const calcs = {};
        const handlers = [];
        const reported = {};
        const unknownReads = {};

        let requestSequence = 0;
        let pendingRequests = {};
        let flushScheduled = false;
        let updateScheduled = false;
        let handlersDirty = false;
        let runningOnData = false;
        let generation = 0;
        let settledGeneration = -1;
        let settling = false;
        let domReady = doc.readyState !== 'loading';
        let loaded = doc.readyState === 'complete';
        let lastMarks = '';
        let lastWidth = win.innerWidth;

        function hasOwn (object, key) {
            return Object.prototype.hasOwnProperty.call(object, key);
        }

        function isPlainObject (value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        }

        function post (message) {
            message.wk = 2;

            try {
                parentWindow.postMessage(message, '*');
            } catch (e) {
                // a janela pai foi fechada ou descarregada: não há a quem avisar
            }
        }

        function errorText (error) {
            return String(error && error.message ? error.message : error);
        }

        // a mesma falha pode se repetir em laço (e chega uma vez por política de CSP): cada uma é avisada uma única vez
        function postError (code, message) {
            const key = code + ' ' + message;

            if (!reported[key]) {
                reported[key] = true;
                post({ type: 'error', code: code, message: message });
            }
        }

        // uma biblioteca desconhecida (wk-lib:<id> que sobrou) já foi avisada pela moldura
        function isLibraryReference (url) {
            return String(url).indexOf('wk-lib') === 0;
        }

        function copyValue (value) {
            return Array.isArray(value) ? value.slice() : value;
        }

        function sameValue (a, b) {
            return JSON.stringify(a) === JSON.stringify(b);
        }

        // ---- Parâmetros: as regras de TAiPanelParams.Apply, para que o navegador recuse o que o servidor recusaria

        function valueTypeOf (def) {
            return def.kind === 'boolean' ? 'boolean' : def.valueType;
        }

        function maxItemsOf (def) {
            return typeof def.maxItems === 'number' && def.maxItems >= 1 ? def.maxItems : DEFAULT_MAX_ITEMS;
        }

        function isIsoDate (text) {
            const match = ISO_DATE_PATTERN.exec(text);

            if (!match) {
                return false;
            }

            const month = Number(match[2]);
            const day = Number(match[3]);

            if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(Number(match[1]), month, 0)).getUTCDate()) {
                return false;
            }

            return match[4] === undefined || (Number(match[4]) <= 23 && Number(match[5]) <= 59 && (match[6] === undefined || Number(match[6]) <= 59));
        }

        function isOfValueType (value, valueType) {
            switch (valueType) {
                case 'string':
                    return typeof value === 'string';

                case 'number':
                    return typeof value === 'number' && isFinite(value);

                case 'boolean':
                    return typeof value === 'boolean';

                case 'date':
                    return typeof value === 'string' && isIsoDate(value);

                default:
                    return false;
            }
        }

        function valueTypeError (def) {
            return 'o parâmetro "' + def.name + '" espera valores do tipo ' + (VALUE_TYPE_NAMES[valueTypeOf(def)] || String(valueTypeOf(def)));
        }

        function checkItem (def, item) {
            if (item !== null && typeof item === 'object') {
                return 'os itens do parâmetro "' + def.name + '" precisam ser valores simples, não listas nem objetos';
            }

            return isOfValueType(item, valueTypeOf(def)) ? '' : valueTypeError(def);
        }

        function checkItems (def, items) {
            for (let i = 0; i < items.length; i++) {
                const error = checkItem(def, items[i]);

                if (error) {
                    return error;
                }
            }

            return '';
        }

        // Texto do erro de um valor (não nulo) para o parâmetro, ou vazio quando ele é válido
        function checkValue (def, value) {
            switch (def.kind) {
                case 'list':
                    if (!Array.isArray(value)) {
                        return 'o parâmetro "' + def.name + '" (list) espera uma lista';
                    }

                    if (value.length > maxItemsOf(def)) {
                        return 'o parâmetro "' + def.name + '" aceita no máximo ' + maxItemsOf(def) + ' itens';
                    }

                    return checkItems(def, value);

                case 'range':
                    if (!Array.isArray(value) || value.length !== 2) {
                        return 'o parâmetro "' + def.name + '" (range) espera uma lista com exatamente 2 valores';
                    }

                    return checkItems(def, value);

                case 'value':
                case 'boolean':
                    return value !== null && typeof value === 'object' ? valueTypeError(def) : checkItem(def, value);

                default:
                    return 'o parâmetro "' + def.name + '" tem uma declaração inválida';
            }
        }

        // O valor inicial (default); sem ele, a lista vazia no list, falso no boolean e nulo (sem valor) no range e no value
        function defaultOf (def) {
            if (def.default !== undefined && def.default !== null && checkValue(def, def.default) === '') {
                return copyValue(def.default);
            }

            if (def.kind === 'list') {
                return [];
            }

            return def.kind === 'boolean' ? false : null;
        }

        function getParams () {
            const result = {};

            Object.keys(values).forEach(function (name) {
                result[name] = copyValue(values[name]);
            });

            return result;
        }

        function applyParams (next) {
            const changed = Object.keys(next).filter(function (name) {
                return !sameValue(values[name], next[name]);
            });

            if (!changed.length) {
                return;
            }

            changed.forEach(function (name) {
                values[name] = next[name];
            });

            post({ type: 'params-changed', params: getParams() });

            // sem cache no navegador: cada mudança refaz os conjuntos já lidos que usam o parâmetro
            Object.keys(datasets).forEach(function (name) {
                const dataset = datasets[name];

                if (dataset.wanted && dataset.params.some(function (param) { return changed.indexOf(param) >= 0; })) {
                    request(name);
                }
            });

            scheduleUpdate();
        }

        // Só aceita parâmetros declarados, com valores válidos; um valor nulo volta ao valor inicial. É tudo ou nada: com um valor inválido,
        // nenhum muda
        function setParams (changes) {
            if (!isPlainObject(changes)) {
                throw new TypeError('weknow.setParams: informe um objeto {parâmetro: valor}');
            }

            const next = {};

            Object.keys(changes).forEach(function (name) {
                if (!hasOwn(paramDefs, name)) {
                    throw new Error('weknow.setParams: parâmetro não declarado: ' + name);
                }

                const value = changes[name];

                if (value === null || value === undefined) {
                    next[name] = defaultOf(paramDefs[name]);
                    return;
                }

                const error = checkValue(paramDefs[name], value);

                if (error) {
                    throw new Error('weknow.setParams: ' + error);
                }

                next[name] = copyValue(value);
            });

            applyParams(next);
        }

        function resetParams () {
            const next = {};

            Object.keys(paramDefs).forEach(function (name) {
                next[name] = defaultOf(paramDefs[name]);
            });

            applyParams(next);
        }

        // ---- Conjuntos de dados: pedidos ao pai, que os executa no servidor (TAiPanelApi/ExecuteDataset)

        function freezeRows (rows) {
            return Object.freeze(rows.map(function (row) {
                return isPlainObject(row) ? Object.freeze(row) : row;
            }));
        }

        function request (name) {
            const dataset = datasets[name];

            dataset.wanted = true;
            dataset.requestId = ++requestSequence;

            // com dado na tela, ele fica até a resposta nova chegar
            if (dataset.status === 'ok' || dataset.status === 'empty') {
                dataset.refreshing = true;
            } else {
                dataset.status = 'loading';
                dataset.refreshing = false;
            }

            pendingRequests[name] = true;
            scheduleFlush();

            // dentro do onData, a página já leu o estado novo: basta acompanhar a mudança, sem rodar o onData de novo
            if (runningOnData) {
                generation++;
            } else {
                scheduleUpdate();
            }
        }

        function calcDependsOn (id, name, seen) {
            return calcs[id].inputs.some(function (input) {
                if (input === name) {
                    return true;
                }

                if (!hasOwn(calcs, input) || seen[input]) {
                    return false;
                }

                seen[input] = true;

                return calcDependsOn(input, name, seen);
            });
        }

        // A maior prioridade entre as marcas do conjunto e dos calc que dependem dele; sem marca, auto
        function priorityOf (name) {
            let best = PRIORITY_ORDER.auto;
            let found = false;

            doc.querySelectorAll('[data-source]').forEach(function (element) {
                const source = element.getAttribute('data-source');

                if (source !== name && !(hasOwn(calcs, source) && calcDependsOn(source, name, {}))) {
                    return;
                }

                const priority = String(element.getAttribute('data-fetchpriority') || 'auto').toLowerCase();
                const order = hasOwn(PRIORITY_ORDER, priority) ? PRIORITY_ORDER[priority] : PRIORITY_ORDER.auto;

                if (!found || order < best) {
                    best = order;
                    found = true;
                }
            });

            return Object.keys(PRIORITY_ORDER).filter(function (key) { return PRIORITY_ORDER[key] === best; })[0];
        }

        function scheduleFlush () {
            if (flushScheduled) {
                return;
            }

            flushScheduled = true;

            Promise.resolve().then(function () {
                flushScheduled = false;

                if (domReady) {
                    flushRequests();
                }
            });
        }

        // Até o DOM ficar pronto os pedidos esperam, para que a prioridade das marcas já seja conhecida. Os pedidos juntos saem na ordem
        // da prioridade e depois na dos pedidos: o pai começa a executar cada um assim que ele chega
        function flushRequests () {
            const requests = Object.keys(pendingRequests).map(function (name) {
                return { name: name, priority: priorityOf(name), id: datasets[name].requestId };
            });

            pendingRequests = {};

            requests.sort(function (a, b) {
                return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || (a.id - b.id);
            });

            requests.forEach(function (item) {
                const params = {};

                datasets[item.name].params.forEach(function (param) {
                    if (hasOwn(values, param) && values[param] !== null) {
                        params[param] = copyValue(values[param]);
                    }
                });

                post({ type: 'data-request', name: item.name, id: item.id, params: params, priority: item.priority });
            });
        }

        function receiveData (message) {
            if (typeof message.name !== 'string' || !hasOwn(datasets, message.name)) {
                return;
            }

            const dataset = datasets[message.name];

            // resposta de um pedido que já foi substituído por outro (parâmetros que mudaram, refresh)
            if (message.id !== dataset.requestId) {
                return;
            }

            dataset.refreshing = false;
            dataset.version++;

            if (message.status === 'ok' || message.status === 'empty') {
                dataset.data = freezeRows(Array.isArray(message.data) ? message.data : []);
                dataset.status = dataset.data.length ? 'ok' : 'empty';
                dataset.columns = freezeRows(Array.isArray(message.columns) ? message.columns : []);
                dataset.meta = Object.freeze(Object.assign({ kind: 'dataset', title: dataset.title }, isPlainObject(message.meta) ? message.meta : {}));
                dataset.message = '';
            } else {
                dataset.status = 'error';
                dataset.data = EMPTY;
                dataset.columns = EMPTY;
                dataset.message = typeof message.message === 'string' ? message.message : '';
            }

            scheduleUpdate();
        }

        // ---- Calc: valores derivados no navegador, a partir de conjuntos ou de outros calc já carregados

        function reaches (inputs, target, seen) {
            return inputs.some(function (input) {
                if (input === target) {
                    return true;
                }

                if (!hasOwn(calcs, input) || seen[input]) {
                    return false;
                }

                seen[input] = true;

                return reaches(calcs[input].inputs, target, seen);
            });
        }

        function declareCalc (id, definition) {
            if (typeof id !== 'string' || !id) {
                throw new TypeError('weknow.calc: informe o id do cálculo');
            }

            const prefix = 'weknow.calc("' + id + '"): ';

            if (runningOnData) {
                throw new Error(prefix + 'declare o cálculo uma única vez, no nível de cima do script, fora do onData');
            }

            if (hasOwn(datasets, id)) {
                throw new Error(prefix + 'o id é o de um conjunto de dados; use outro id');
            }

            if (hasOwn(calcs, id)) {
                throw new Error(prefix + 'cálculo já declarado; declare cada cálculo uma única vez');
            }

            if (!isPlainObject(definition) || typeof definition.fn !== 'function') {
                throw new TypeError(prefix + 'informe {inputs, fn}, com fn uma função');
            }

            const inputs = definition.inputs;

            if (!Array.isArray(inputs) || !inputs.length || inputs.some(function (input) { return typeof input !== 'string' || !input; })) {
                throw new TypeError(prefix + 'inputs precisa ser uma lista com os ids dos conjuntos ou dos cálculos de entrada');
            }

            if (reaches(inputs, id, {})) {
                throw new Error(prefix + 'ciclo entre cálculos: o cálculo depende do próprio resultado');
            }

            const title = typeof definition.title === 'string' ? definition.title : '';
            const description = typeof definition.description === 'string' ? definition.description : '';

            calcs[id] = {
                id: id,
                title: title,
                description: description,
                inputs: inputs.slice(),
                fn: definition.fn,
                fnText: String(definition.fn),
                wanted: false,
                key: null,
                result: undefined,
                error: '',
                status: 'idle',
                data: EMPTY,
                columns: EMPTY,
                meta: Object.freeze({ kind: 'calc', title: title, description: description, inputs: Object.freeze(inputs.slice()) }),
                message: '',
                refreshing: false,
                version: 0,
                posted: ''
            };

            postCalc(calcs[id]);
        }

        function freezeResult (result) {
            if (Array.isArray(result)) {
                return freezeRows(result);
            }

            return isPlainObject(result) ? Object.freeze(result) : result;
        }

        function columnsOfRows (rows) {
            const names = [];

            rows.slice(0, 50).forEach(function (row) {
                if (isPlainObject(row)) {
                    Object.keys(row).forEach(function (name) {
                        if (names.indexOf(name) < 0) {
                            names.push(name);
                        }
                    });
                }
            });

            return Object.freeze(names.map(function (name) { return Object.freeze({ name: name }); }));
        }

        // Estado de uma entrada de calc; a leitura de um conjunto pela primeira vez dispara o pedido dele
        function readSource (id) {
            if (hasOwn(datasets, id)) {
                if (!datasets[id].wanted) {
                    request(id);
                }

                return datasets[id];
            }

            return hasOwn(calcs, id) ? evaluateCalc(calcs[id]) : null;
        }

        // O estado do calc é derivado das entradas: loading enquanto alguma carrega, error se uma falhou ou se fn lançou exceção, e o
        // resultado de fn (guardado até uma entrada mudar) quando todas estão ok ou empty
        function evaluateCalc (calc) {
            calc.wanted = true;

            const entries = calc.inputs.map(readSource);
            const missing = calc.inputs.filter(function (input, index) { return !entries[index]; });
            const failed = calc.inputs.filter(function (input, index) { return entries[index] && entries[index].status === 'error'; });
            const loading = entries.some(function (entry) { return entry && (entry.status === 'loading' || entry.status === 'idle'); });

            calc.refreshing = false;
            calc.message = '';

            if (missing.length) {
                calc.status = 'error';
                calc.message = 'entrada não declarada: ' + missing.join(', ');
            } else if (failed.length) {
                calc.status = 'error';
                calc.message = 'a entrada não carregou: ' + failed.join(', ');
            } else if (loading) {
                calc.status = 'loading';
            } else {
                const key = entries.map(function (entry) { return entry.version; }).join(',');

                if (calc.key !== key) {
                    calc.key = key;
                    calc.version++;

                    try {
                        calc.result = freezeResult(calc.fn.apply(null, entries.map(function (entry) { return entry.data; })));
                        calc.error = '';
                    } catch (e) {
                        calc.result = undefined;
                        calc.error = errorText(e);
                        post({ type: 'calc-error', id: calc.id, message: calc.error });
                    }
                }

                if (calc.error) {
                    calc.status = 'error';
                    calc.message = calc.error;
                } else {
                    calc.status = Array.isArray(calc.result) && !calc.result.length ? 'empty' : 'ok';
                }

                calc.refreshing = entries.some(function (entry) { return entry.refreshing; });
            }

            if (calc.status === 'ok' || calc.status === 'empty') {
                calc.data = calc.result;
                calc.columns = Array.isArray(calc.result) ? columnsOfRows(calc.result) : EMPTY;
            } else {
                calc.data = EMPTY;
                calc.columns = EMPTY;
            }

            return calc;
        }

        function postCalc (calc) {
            const signature = [calc.status, calc.version, calc.refreshing, calc.message].join('|');

            if (signature === calc.posted) {
                return;
            }

            calc.posted = signature;

            const rows = Array.isArray(calc.data) ? calc.data : (calc.status === 'ok' ? [calc.data] : []);
            let preview;

            try {
                preview = JSON.parse(JSON.stringify(rows.slice(0, CALC_PREVIEW_ROWS)));
            } catch (e) {
                preview = [];
            }

            post({
                type: 'calc',
                id: calc.id,
                title: calc.title,
                description: calc.description,
                inputs: calc.inputs.slice(),
                fn: calc.fnText,
                status: calc.status,
                message: calc.message,
                refreshing: calc.refreshing,
                data: preview,
                columns: calc.columns.map(function (column) { return column.name; }),
                rowCount: rows.length
            });
        }

        // ---- API da página

        function snapshot (entry) {
            return Object.freeze({
                status: entry.status === 'idle' ? 'loading' : entry.status,
                data: entry.data,
                columns: entry.columns,
                meta: entry.meta,
                refreshing: entry.refreshing,
                message: entry.message
            });
        }

        function data (id) {
            if (hasOwn(datasets, id)) {
                return snapshot(readSource(id));
            }

            if (hasOwn(calcs, id)) {
                return snapshot(evaluateCalc(calcs[id]));
            }

            unknownReads[String(id)] = true;

            return Object.freeze({
                status: 'error',
                data: EMPTY,
                columns: EMPTY,
                meta: NO_META,
                refreshing: false,
                message: 'weknow.data: "' + id + '" não é um conjunto nem um cálculo declarado'
            });
        }

        function runHandlers (list) {
            runningOnData = true;

            try {
                list.forEach(function (fn) {
                    try {
                        fn(api);
                    } catch (e) {
                        postError('script', errorText(e));
                    }
                });
            } finally {
                runningOnData = false;
            }
        }

        function onData (fn) {
            if (typeof fn !== 'function') {
                throw new TypeError('weknow.onData: informe uma função');
            }

            if (runningOnData) {
                throw new Error('weknow.onData: registre a função fora do onData');
            }

            handlers.push(fn);

            // com o DOM pronto roda já; antes dele, roda quando o DOM fica pronto, com as demais
            if (domReady) {
                runHandlers([fn]);
                scheduleUpdate(false);
            }
        }

        function refresh (id) {
            if (id === undefined || id === null) {
                Object.keys(datasets).forEach(function (name) {
                    if (datasets[name].wanted) {
                        request(name);
                    }
                });

                return;
            }

            if (hasOwn(datasets, id)) {
                request(id);
                return;
            }

            if (hasOwn(calcs, id)) {
                calcs[id].inputs.forEach(function (input) {
                    if (hasOwn(datasets, input) || hasOwn(calcs, input)) {
                        refresh(input);
                    }
                });

                return;
            }

            throw new Error('weknow.refresh: "' + id + '" não é um conjunto nem um cálculo declarado');
        }

        function unsupported (name, reason) {
            return function () {
                throw new Error('weknow.' + name + ' não existe no Weknow: ' + reason);
            };
        }

        // ---- Tema

        // A página segue o tema do Weknow (weknow.theme), não o do sistema operacional: dentro do iframe, prefers-color-scheme responde
        // pelo sistema, e uma página com regras para o modo escuro ficaria escura num Weknow claro (ou o contrário), misturando os dois
        // temas com as cores de weknow.colors. Força o color-scheme (fundo e controles nativos) e, quando o sistema e o Weknow divergem,
        // inverte dark/light nas condições prefers-color-scheme das folhas de estilo e do matchMedia
        function followWeknowTheme () {
            const schemeStyle = doc.createElement('style');

            schemeStyle.textContent = ':root{color-scheme:' + theme + ' !important}';
            (doc.head || doc.documentElement).appendChild(schemeStyle);

            if (typeof win.matchMedia !== 'function') {
                return;
            }

            const nativeMatchMedia = win.matchMedia.bind(win);
            const systemDark = nativeMatchMedia('(prefers-color-scheme: dark)');
            const originals = new WeakMap();
            let scheduled = false;

            function adjust (text) {
                if (systemDark.matches === (theme === 'dark')) {
                    return text;
                }

                return text.replace(COLOR_SCHEME_FEATURE, function (match, feature, scheme) {
                    return feature + (scheme.toLowerCase() === 'dark' ? 'light' : 'dark');
                });
            }

            function adjustMedia (media) {
                if (!media) {
                    return;
                }

                let original = originals.get(media);

                if (original === undefined) {
                    original = media.mediaText;

                    if (original.toLowerCase().indexOf('prefers-color-scheme') < 0) {
                        return;
                    }

                    originals.set(media, original);
                }

                const adjusted = adjust(original);

                if (media.mediaText !== adjusted) {
                    media.mediaText = adjusted;
                }
            }

            function adjustRules (rules) {
                for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i];

                    // @media e @import têm media; @import tem a folha importada; @supports, @layer, @container e aninhamentos têm regras
                    adjustMedia(rule.media);

                    if (rule.styleSheet) {
                        adjustSheet(rule.styleSheet);
                    }

                    if (rule.cssRules) {
                        adjustRules(rule.cssRules);
                    }
                }
            }

            function adjustSheet (sheet) {
                adjustMedia(sheet.media);

                let rules = null;

                try {
                    rules = sheet.cssRules;
                } catch (e) {
                    // folha de outra origem: as regras não são acessíveis
                }

                if (rules) {
                    adjustRules(rules);
                }
            }

            function adjustAll () {
                scheduled = false;

                for (let i = 0; i < doc.styleSheets.length; i++) {
                    adjustSheet(doc.styleSheets[i]);
                }
            }

            function scheduleAdjust () {
                if (!scheduled) {
                    scheduled = true;
                    Promise.resolve().then(adjustAll);
                }
            }

            function touchesStyles (node) {
                return node.nodeName === 'STYLE' || node.nodeName === 'LINK' ||
                    (typeof node.querySelector === 'function' && !!node.querySelector('style, link'));
            }

            win.matchMedia = function (query) {
                return nativeMatchMedia(adjust(String(query)));
            };

            // as folhas da página são lidas pelo parser depois deste script: o observador as ajusta à medida que chegam, antes da pintura
            if (typeof win.MutationObserver === 'function') {
                new win.MutationObserver(function (records) {
                    const relevant = records.some(function (record) {
                        return record.target.nodeName === 'STYLE' || (record.target.parentNode && record.target.parentNode.nodeName === 'STYLE') ||
                            Array.prototype.some.call(record.addedNodes, touchesStyles);
                    });

                    if (relevant) {
                        scheduleAdjust();
                    }
                }).observe(doc, { childList: true, subtree: true, characterData: true });
            }

            // <link rel="stylesheet"> só tem regras depois de carregar; o evento load não sobe, por isso a captura
            doc.addEventListener('load', scheduleAdjust, true);
            doc.addEventListener('DOMContentLoaded', scheduleAdjust);

            if (typeof systemDark.addEventListener === 'function') {
                systemDark.addEventListener('change', adjustAll);
            }

            adjustAll();
        }

        // ---- Atualização: onData, calc, marcas, pedidos e o aviso de que a página assentou

        function scheduleUpdate (withHandlers) {
            generation++;

            if (withHandlers !== false) {
                handlersDirty = true;
            }

            if (updateScheduled) {
                return;
            }

            updateScheduled = true;
            Promise.resolve().then(runUpdate);
        }

        function runUpdate () {
            updateScheduled = false;

            if (!domReady) {
                return;
            }

            if (handlersDirty) {
                handlersDirty = false;
                runHandlers(handlers);
            }

            Object.keys(calcs).forEach(function (id) {
                if (calcs[id].wanted) {
                    evaluateCalc(calcs[id]);
                }

                postCalc(calcs[id]);
            });

            scanMarks();
            flushRequests();
            checkSettled();
        }

        function peek (id) {
            if (hasOwn(datasets, id)) {
                return datasets[id];
            }

            return hasOwn(calcs, id) ? calcs[id] : null;
        }

        function markState (entry) {
            if (!entry) {
                return 'error';
            }

            if (!entry.wanted) {
                return '';
            }

            if (entry.status === 'loading' || entry.status === 'idle') {
                return 'loading';
            }

            if (entry.status === 'error') {
                return 'error';
            }

            if (entry.refreshing) {
                return 'refreshing';
            }

            return entry.status === 'empty' ? 'empty' : '';
        }

        function markKind (element) {
            if (element.hasAttribute('data-row-key')) {
                return 'table';
            }

            return element.hasAttribute('data-field') ? 'cell' : 'chart';
        }

        function describeMark (element) {
            return {
                source: element.getAttribute('data-source') || '',
                field: element.getAttribute('data-field') || '',
                row: element.getAttribute('data-row') || '',
                where: element.getAttribute('data-where') || '',
                rowKey: element.getAttribute('data-row-key') || '',
                priority: element.getAttribute('data-fetchpriority') || '',
                kind: markKind(element)
            };
        }

        function scanMarks () {
            const list = [];

            doc.querySelectorAll('[data-source]').forEach(function (element) {
                const state = markState(peek(element.getAttribute('data-source')));

                if (state) {
                    element.setAttribute('data-dash-source-state', state);
                } else {
                    element.removeAttribute('data-dash-source-state');
                }

                list.push(describeMark(element));
            });

            const entries = Object.keys(datasets).map(function (name) { return datasets[name]; })
                .concat(Object.keys(calcs).map(function (id) { return calcs[id]; }))
                .filter(function (entry) { return entry.wanted; });
            const loading = entries.some(function (entry) { return entry.status === 'loading' || entry.status === 'idle'; });
            const refreshing = entries.some(function (entry) { return entry.refreshing; });

            doc.documentElement.setAttribute('data-dash-state', loading ? 'loading' : (refreshing ? 'refreshing' : 'ready'));

            const text = JSON.stringify(list);

            if (text !== lastMarks) {
                lastMarks = text;
                post({ type: 'marks', list: list });
            }
        }

        function isFinal (entry) {
            return FINAL_STATUS[entry.status] === true && !entry.refreshing;
        }

        function isSettled () {
            if (!domReady || !loaded || Object.keys(pendingRequests).length) {
                return false;
            }

            return Object.keys(datasets).every(function (name) { return !datasets[name].wanted || isFinal(datasets[name]); }) &&
                Object.keys(calcs).every(function (id) { return !calcs[id].wanted || isFinal(calcs[id]); });
        }

        // Assentou quando todos os conjuntos pedidos e os calc lidos estão em ok, empty ou error, o onData rodou e passaram dois quadros
        // sem mudança: avisa com a checagem e o settled, uma vez por estado
        function checkSettled () {
            if (settling || settledGeneration === generation || !isSettled()) {
                return;
            }

            settling = true;

            const expected = generation;
            const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();

            fontsReady.then(function () {
                win.requestAnimationFrame(function () {
                    win.requestAnimationFrame(function () {
                        settling = false;

                        if (expected !== generation || !isSettled()) {
                            checkSettled();
                            return;
                        }

                        settledGeneration = generation;
                        scanMarks();
                        post({ type: 'check', check: buildCheck() });
                        post({ type: 'settled' });
                    });
                });
            });
        }

        // ---- Checagem da página: o valor de cada marca contra o dado, marcas sem fonte ou sem linha, NaN, gráfico vazio e calc que falhou

        function visibleText (root) {
            if (!root) {
                return '';
            }

            const walker = doc.createTreeWalker(root, 4);
            let text = '';
            let node;

            while ((node = walker.nextNode())) {
                if (!node.parentNode || !IGNORED_TEXT_PARENTS[node.parentNode.nodeName]) {
                    text += node.nodeValue;
                }
            }

            return text;
        }

        function shortText (text) {
            const result = String(text).replace(/\s+/g, ' ').trim();

            return result.length > MAX_TEXT ? result.substring(0, MAX_TEXT) + '…' : result;
        }

        function localeDecimalSeparator () {
            try {
                return (1.5).toLocaleString(config.locale || undefined).replace(/\d/g, '').charAt(0) || '.';
            } catch (e) {
                return '.';
            }
        }

        const decimalSeparator = localeDecimalSeparator();

        // O primeiro número do texto exibido, com o separador decimal deduzido (o último de dois tipos diferentes; com um só tipo, o do
        // idioma, a menos que ele se repita ou que haja exatamente três dígitos depois dele num separador diferente do idioma)
        function parseShownNumber (text) {
            const match = SHOWN_NUMBER_PATTERN.exec(String(text));

            if (!match) {
                return null;
            }

            const raw = match[0].replace(/[\s  ]/g, '').replace('−', '-').replace(/[.,]+$/, '');
            const lastDot = raw.lastIndexOf('.');
            const lastComma = raw.lastIndexOf(',');
            let decimal = '';

            if (lastDot >= 0 && lastComma >= 0) {
                decimal = lastDot > lastComma ? '.' : ',';
            } else if (lastDot >= 0 || lastComma >= 0) {
                const separator = lastDot >= 0 ? '.' : ',';
                const repeated = raw.split(separator).length > 2;
                const digitsAfter = raw.length - raw.lastIndexOf(separator) - 1;

                if (!repeated && (separator === decimalSeparator || digitsAfter !== 3)) {
                    decimal = separator;
                }
            }

            let normalized = raw.replace(decimal === '.' ? /,/g : (decimal === ',' ? /\./g : /[.,]/g), '');

            if (decimal === ',') {
                normalized = normalized.replace(',', '.');
            }

            const value = Number(normalized);

            if (!isFinite(value)) {
                return null;
            }

            const point = normalized.indexOf('.');

            return { value: value, decimals: point >= 0 ? normalized.length - point - 1 : 0 };
        }

        function matchesNumber (text, value) {
            const shown = parseShownNumber(text);

            if (!shown) {
                return false;
            }

            const tolerance = 0.5 * Math.pow(10, -shown.decimals);

            return NUMBER_SCALES.some(function (scale) {
                const expected = Math.abs(value * scale);

                return Math.abs(Math.abs(shown.value) - expected) <= tolerance * (1 + 1e-9) + expected * 1e-9;
            });
        }

        function normalizeText (text) {
            return String(text).replace(/\s+/g, ' ').trim().toLowerCase();
        }

        // Datas e lógicos não são comparados (a formatação da página varia demais); textos, por inclusão; números, com o arredondamento
        // e as escalas exibidas
        function matchesValue (text, value) {
            if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
                return true;
            }

            if (typeof value === 'number') {
                return matchesNumber(text, value);
            }

            const valueText = String(value);

            return DATE_VALUE_PATTERN.test(valueText) || normalizeText(text).indexOf(normalizeText(valueText)) >= 0;
        }

        function parseWhere (text) {
            try {
                const value = JSON.parse(text);

                if (isPlainObject(value)) {
                    return value;
                }
            } catch (e) {
                // não é JSON: campo=valor;campo=valor
            }

            const result = {};
            let found = false;

            String(text || '').split(/[;&]/).forEach(function (part) {
                const index = part.indexOf('=');

                if (index > 0) {
                    result[part.substring(0, index).trim()] = part.substring(index + 1).trim();
                    found = true;
                }
            });

            return found ? result : null;
        }

        function sameCell (dataValue, wanted) {
            if (dataValue === null || dataValue === undefined) {
                return wanted === null || wanted === undefined || wanted === '';
            }

            if (typeof dataValue === 'number' || typeof wanted === 'number') {
                return Number(dataValue) === Number(wanted);
            }

            return String(dataValue) === String(wanted);
        }

        function findRow (rows, where) {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                if (isPlainObject(row) && Object.keys(where).every(function (key) { return sameCell(row[key], where[key]); })) {
                    return i;
                }
            }

            return -1;
        }

        // Índice da linha indicada por data-row ou data-where, no elemento ou num ancestral; -1 quando a linha não existe e undefined
        // quando nada indica a linha
        function resolveRow (element, rows) {
            const holder = element.closest('[data-row],[data-where]');

            if (!holder) {
                return undefined;
            }

            if (holder.hasAttribute('data-row')) {
                const index = Number(holder.getAttribute('data-row'));

                return Number.isInteger(index) && index >= 0 && index < rows.length ? index : -1;
            }

            const where = parseWhere(holder.getAttribute('data-where'));

            return where ? findRow(rows, where) : -1;
        }

        // Campo e linha de uma célula de tabela marcada: o data-field da célula ou do <th> da coluna, e a linha por data-row/data-where ou
        // pelo valor da coluna data-row-key
        function tableCell (cell, table, rows) {
            const headerRow = table.querySelector('thead tr:last-child') || table.querySelector('tr');
            const header = headerRow && headerRow.cells ? headerRow.cells[cell.cellIndex] : null;
            const field = cell.getAttribute('data-field') || (header && header.getAttribute('data-field')) || '';
            let row = resolveRow(cell, rows);

            if (row === undefined) {
                row = -1;

                const rowKey = table.getAttribute('data-row-key');
                const cells = headerRow && headerRow.cells ? Array.prototype.slice.call(headerRow.cells) : [];
                const keyIndex = cells.findIndex(function (item) { return item.getAttribute('data-field') === rowKey; });
                const line = cell.parentElement;

                if (rowKey && keyIndex >= 0 && line && line.cells && line.cells[keyIndex] && line !== headerRow) {
                    const keyText = String(line.cells[keyIndex].textContent).trim();

                    row = rows.findIndex(function (item) { return isPlainObject(item) && String(item[rowKey]).trim() === keyText; });
                }
            }

            return { field: field, row: row };
        }

        function isBlankCanvas (canvas) {
            if (!canvas.width || !canvas.height) {
                return true;
            }

            try {
                const context = canvas.getContext('2d');

                // um canvas WebGL não entrega os pixels pelo contexto 2d: não dá para afirmar que está vazio
                if (!context) {
                    return false;
                }

                const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                const step = Math.max(1, Math.floor(pixels.length / 4 / 20000)) * 4;

                for (let i = 3; i < pixels.length; i += step) {
                    if (pixels[i] !== 0) {
                        return false;
                    }
                }

                return true;
            } catch (e) {
                return false;
            }
        }

        function isEmptyChart (element) {
            const tag = element.tagName.toLowerCase();
            const canvases = tag === 'canvas' ? [element] : Array.prototype.slice.call(element.querySelectorAll('canvas'));

            if (canvases.length) {
                return canvases.every(isBlankCanvas);
            }

            const svgs = tag === 'svg' ? [element] : Array.prototype.slice.call(element.querySelectorAll('svg'));

            if (svgs.length) {
                return svgs.every(function (svg) {
                    return !svg.querySelector('path,rect,circle,line,polyline,polygon,ellipse,text,image,use');
                });
            }

            return !element.children.length && !visibleText(element).trim();
        }

        function buildCheck () {
            const issues = [];
            let nanFound = false;
            let markCount = 0;

            function add (issue) {
                if (issues.length < MAX_ISSUES) {
                    issues.push(issue);
                }
            }

            doc.querySelectorAll('[data-source]').forEach(function (element) {
                const source = element.getAttribute('data-source');
                const field = element.getAttribute('data-field') || '';
                const entry = peek(source);
                const text = visibleText(element);
                const kind = markKind(element);

                markCount++;

                if (!entry) {
                    add({ code: 'unknown-source', source: source, field: field, message: 'A marca aponta para um conjunto ou cálculo não declarado' });
                    return;
                }

                if (!entry.wanted) {
                    add({ code: 'source-not-read', source: source, field: field, message: 'O conjunto ou cálculo da marca não foi lido com weknow.data' });
                    return;
                }

                if (NAN_PATTERN.test(text)) {
                    nanFound = true;
                    add({ code: 'nan', source: source, field: field, shown: shortText(text), message: 'A marca exibe NaN ou Infinity' });
                }

                if (entry.status !== 'ok') {
                    return;
                }

                const rows = Array.isArray(entry.data) ? entry.data : null;
                const names = entry.columns.map(function (column) { return column.name; });

                if (kind === 'table') {
                    element.querySelectorAll('th[data-field]').forEach(function (header) {
                        const headerField = header.getAttribute('data-field');

                        if (!header.hasAttribute('data-source') && names.length && names.indexOf(headerField) < 0) {
                            add({ code: 'unknown-field', source: source, field: headerField, message: 'O campo da coluna não existe nos dados' });
                        }
                    });

                    return;
                }

                if (kind === 'chart') {
                    if (isEmptyChart(element)) {
                        add({ code: 'empty-chart', source: source, message: 'O gráfico da marca ficou vazio, embora haja dados' });
                    }

                    return;
                }

                // calc que devolve um valor simples: a marca exibe o próprio valor
                if (!rows) {
                    if (element.tagName !== 'TH' && !matchesValue(text, isPlainObject(entry.data) ? entry.data[field] : entry.data)) {
                        add({ code: 'value-mismatch', source: source, field: field, shown: shortText(text), message: 'O valor exibido não confere com o dado' });
                    }

                    return;
                }

                if (names.length && names.indexOf(field) < 0) {
                    add({ code: 'unknown-field', source: source, field: field, message: 'O campo da marca não existe nos dados' });
                    return;
                }

                if (element.tagName === 'TH') {
                    return;
                }

                let row = resolveRow(element, rows);

                if (row === undefined) {
                    if (rows.length !== 1) {
                        add({ code: 'row-missing', source: source, field: field, message: 'A marca não indica a linha (data-row ou data-where), e há ' + rows.length + ' linhas' });
                        return;
                    }

                    row = 0;
                }

                if (row < 0) {
                    add({ code: 'row-not-found', source: source, field: field, message: 'A linha indicada pela marca não existe nos dados' });
                    return;
                }

                const value = isPlainObject(rows[row]) ? rows[row][field] : undefined;

                if (!matchesValue(text, value)) {
                    add({
                        code: 'value-mismatch',
                        source: source,
                        field: field,
                        row: row,
                        expected: value === undefined ? null : value,
                        shown: shortText(text),
                        message: 'O valor exibido não confere com o dado'
                    });
                }
            });

            if (!nanFound && NAN_PATTERN.test(visibleText(doc.body))) {
                add({ code: 'nan', message: 'A página exibe NaN ou Infinity' });
            }

            Object.keys(unknownReads).forEach(function (id) {
                add({ code: 'unknown-source', source: id, message: 'weknow.data leu um conjunto ou cálculo não declarado' });
            });

            const summary = { marks: markCount, datasets: {}, calcs: {} };

            Object.keys(datasets).forEach(function (name) {
                const dataset = datasets[name];

                if (dataset.wanted) {
                    summary.datasets[name] = { status: dataset.status, rows: dataset.data.length };

                    if (dataset.status === 'error') {
                        add({ code: 'dataset-error', source: name, message: dataset.message });
                    }
                }
            });

            Object.keys(calcs).forEach(function (id) {
                const calc = calcs[id];

                summary.calcs[id] = calc.wanted ? calc.status : 'idle';

                if (calc.wanted && calc.status === 'error') {
                    add({ code: 'calc-error', source: id, message: calc.message });
                }
            });

            return { issues: issues, summary: summary };
        }

        function onMarkClick (event) {
            const target = event.target && event.target.closest ? event.target : null;
            const element = target ? target.closest('[data-source]') : null;

            if (!element) {
                return;
            }

            const source = element.getAttribute('data-source');
            const entry = peek(source);
            const rows = entry && Array.isArray(entry.data) ? entry.data : EMPTY;
            let field = element.getAttribute('data-field') || '';
            let row = -1;

            if (markKind(element) === 'table') {
                const cell = target.closest('td,th');

                if (cell && element.contains(cell)) {
                    const position = tableCell(cell, element, rows);

                    field = position.field;
                    row = position.row;
                }
            } else {
                const resolved = resolveRow(element, rows);

                row = resolved === undefined ? (rows.length === 1 ? 0 : -1) : resolved;
            }

            post({ type: 'mark-click', source: source, field: field, row: row });
        }

        function notifyRendered () {
            const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();

            fontsReady.then(function () {
                win.requestAnimationFrame(function () {
                    win.requestAnimationFrame(function () {
                        post({ type: 'rendered' });
                    });
                });
            });
        }

        // ---- Imagem da página (exportação), gerada pelo html-to-image local: o da própria página, se ela o carregou, ou carregado agora

        let snapshotLibrary = null;

        function snapshotLibraryOf (target) {
            return target && typeof target.toPng === 'function' ? target : null;
        }

        function loadSnapshotLibrary () {
            const loaded = snapshotLibraryOf(win.htmlToImage);

            if (loaded) {
                return Promise.resolve(loaded);
            }

            if (typeof config.snapshotLibrary !== 'string' || !config.snapshotLibrary) {
                return Promise.reject(new Error('a biblioteca html-to-image não está disponível'));
            }

            if (!snapshotLibrary) {
                snapshotLibrary = new Promise(function (resolve, reject) {
                    const script = doc.createElement('script');

                    script.onload = function () {
                        const library = snapshotLibraryOf(win.htmlToImage);

                        if (library) {
                            resolve(library);
                        } else {
                            snapshotLibrary = null;
                            reject(new Error('a biblioteca html-to-image não carregou'));
                        }
                    };
                    script.onerror = function () {
                        snapshotLibrary = null;
                        reject(new Error('a biblioteca html-to-image não carregou'));
                    };
                    script.src = config.snapshotLibrary;
                    (doc.head || doc.documentElement).appendChild(script);
                });
            }

            return snapshotLibrary;
        }

        function isTransparent (color) {
            return !color || color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color);
        }

        // o fundo da imagem é o da página (o do <body> ou o do <html>); sem nenhum, branco
        function snapshotBackground () {
            if (typeof win.getComputedStyle !== 'function') {
                return '#ffffff';
            }

            const color = [doc.body, doc.documentElement].map(function (element) {
                return element ? win.getComputedStyle(element).backgroundColor : '';
            }).filter(function (item) {
                return !isTransparent(item);
            })[0];

            return color || '#ffffff';
        }

        // A imagem tem o tamanho da moldura e começa no topo do documento, como a página aparece ao abrir. Espera as fontes e dois quadros,
        // para incluir o redesenho de uma mudança de largura recente. Sem fontes da web (skipFonts): a CSP da moldura não deixa buscá-las
        function takeSnapshot (id) {
            const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();

            fontsReady.then(function () {
                return new Promise(function (resolve) {
                    win.requestAnimationFrame(function () {
                        win.requestAnimationFrame(resolve);
                    });
                });
            }).then(loadSnapshotLibrary).then(function (library) {
                const width = Math.max(1, Math.round(win.innerWidth || 0));
                const height = Math.max(1, Math.round(win.innerHeight || 0));

                return library.toPng(doc.body || doc.documentElement, {
                    width: width,
                    height: height,
                    backgroundColor: snapshotBackground(),
                    skipFonts: true
                }).then(function (dataUrl) {
                    post({ type: 'snapshot-result', id: id, status: 'ok', dataUrl: String(dataUrl), width: width, height: height });
                });
            }).catch(function (error) {
                post({ type: 'snapshot-result', id: id, status: 'error', message: errorText(error) });
            });
        }

        // ---- Início

        (Array.isArray(config.params) ? config.params : []).forEach(function (def) {
            if (isPlainObject(def) && typeof def.name === 'string' && def.name) {
                paramDefs[def.name] = def;
                values[def.name] = defaultOf(def);
            }
        });

        (Array.isArray(config.datasets) ? config.datasets : []).forEach(function (item) {
            if (isPlainObject(item) && typeof item.name === 'string' && item.name) {
                const title = typeof item.title === 'string' ? item.title : '';

                datasets[item.name] = {
                    name: item.name,
                    title: title,
                    params: Array.isArray(item.params) ? item.params.filter(function (param) { return typeof param === 'string'; }) : [],
                    wanted: false,
                    status: 'idle',
                    data: EMPTY,
                    columns: EMPTY,
                    meta: Object.freeze({ kind: 'dataset', title: title }),
                    message: '',
                    refreshing: false,
                    requestId: 0,
                    version: 0
                };
            }
        });

        const theme = config.theme === 'dark' ? 'dark' : 'light';
        const api = Object.freeze({
            version: 1,
            locale: typeof config.locale === 'string' ? config.locale : '',
            theme: theme,
            colors: Object.freeze(COLORS[theme].slice()),
            data: data,
            onData: onData,
            calc: declareCalc,
            params: getParams,
            setParams: setParams,
            resetParams: resetParams,
            refresh: function (id) {
                refresh(id);
            },
            loader: unsupported('loader', 'o servidor já entrega as linhas prontas e tipadas em weknow.data(id).data'),
            setLink: unsupported('setLink', 'o painel não abre links para outros painéis')
        });

        ['weknow', 'dash'].forEach(function (name) {
            Object.defineProperty(win, name, { value: api, writable: false, configurable: false, enumerable: true });
        });

        const style = doc.createElement('style');

        style.textContent = STATE_STYLE;
        (doc.head || doc.documentElement).appendChild(style);

        followWeknowTheme();

        win.addEventListener('message', function (event) {
            const message = event.data;

            if (event.source !== parentWindow || !isPlainObject(message) || message.wk !== 2) {
                return;
            }

            switch (message.type) {
                case 'ping':
                    post({ type: 'pong', id: message.id });
                    break;

                case 'data-response':
                    receiveData(message);
                    break;

                case 'refresh':
                    try {
                        refresh(typeof message.name === 'string' ? message.name : undefined);
                    } catch (e) {
                        // um conjunto que a página não declara: nada a refazer
                    }
                    break;

                case 'snapshot':
                    if (typeof message.id === 'number') {
                        takeSnapshot(message.id);
                    }
                    break;
            }
        });

        win.addEventListener('error', function (event) {
            if (typeof ErrorEvent !== 'undefined' && event instanceof ErrorEvent) {
                postError('script', String(event.message || event.error || ''));
            } else if (event.target && event.target !== win) {
                // falha ao carregar um recurso (script, imagem, folha de estilo): o evento não sobe, por isso a captura
                const source = String(event.target.src || event.target.href || event.target.tagName || '');

                if (!isLibraryReference(source)) {
                    postError('resource', source);
                }
            }
        }, true);

        win.addEventListener('unhandledrejection', function (event) {
            postError('script', errorText(event.reason));
        });

        // recurso bloqueado pela CSP da moldura (fetch, imagem externa etc.): é um erro da página, não da configuração do servidor
        doc.addEventListener('securitypolicyviolation', function (event) {
            if (!isLibraryReference(event.blockedURI)) {
                postError('csp', event.effectiveDirective + ' ' + event.blockedURI);
            }
        });

        doc.addEventListener('click', onMarkClick);

        win.addEventListener('resize', function () {
            if (win.innerWidth !== lastWidth) {
                lastWidth = win.innerWidth;
                scheduleUpdate();
            }
        });

        if (!domReady) {
            doc.addEventListener('DOMContentLoaded', function () {
                domReady = true;
                scheduleUpdate();
            });
        }

        if (loaded) {
            notifyRendered();
        } else {
            win.addEventListener('load', function () {
                loaded = true;
                notifyRendered();
                scheduleUpdate(false);
            });
        }

        post({ type: 'params-changed', params: getParams() });

        if (domReady) {
            scheduleUpdate();
        }

        return { api: api, buildCheck: buildCheck, parseShownNumber: parseShownNumber };
    }

    function createPanelBridgeScript (payload) {
        const config = {
            params: payload.params,
            datasets: payload.datasets,
            locale: payload.locale,
            theme: payload.theme,
            snapshotLibrary: payload.libsBaseUrl ? librariesBaseUrl(payload.libsBaseUrl) + LIBRARIES['html-to-image'] : ''
        };

        return '<meta http-equiv="Content-Security-Policy" content="' + CONTENT_SECURITY_POLICY + '">' +
            '<script>(' + panelBridge.toString() + ')(' + toScriptJson(config) + ', window);</script>';
    }

    // Insere o script ponte no início do <head>; sem <head>, logo depois do <html> ou do doctype, onde o parser abre o <head> sozinho
    function injectBridge (html, bridgeScript) {
        const pattern = [HEAD_PATTERN, HTML_PATTERN, DOCTYPE_PATTERN].find(function (item) {
            return item.test(html);
        });

        if (!pattern) {
            return bridgeScript + html;
        }

        const match = pattern.exec(html);
        const position = match.index + match[0].length;

        return html.substring(0, position) + bridgeScript + html.substring(position);
    }

    // Um script inline só roda se a CSP do servidor web permitir. Se ela bloquear, o script ponte também seria bloqueado
    function canRunInlineScript (win) {
        const flag = '__wkFrameInlineScriptTest';
        const script = win.document.createElement('script');

        win[flag] = false;
        script.textContent = 'window.' + flag + ' = true;';

        (win.document.head || win.document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);

        const result = win[flag] === true;

        delete win[flag];

        return result;
    }

    // Monta o documento do painel de IA: troca as bibliotecas e injeta o script ponte do painel (sem dados: a página os pede sob demanda)
    function buildPanelDocument (payload) {
        const libraries = replaceLibraries(payload.html, payload.libsBaseUrl);

        return {
            html: injectBridge(libraries.html, createPanelBridgeScript(payload)),
            unknownLibraries: libraries.unknownLibraries
        };
    }

    function post (target, message) {
        message.wk = PANEL_PROTOCOL_VERSION;
        target.postMessage(message, '*');
    }

    function render (win, parentWindow, built) {
        if (!canRunInlineScript(win)) {
            post(parentWindow, { type: 'csp-violation', directive: 'script-src' });
            return;
        }

        built.unknownLibraries.forEach(function (id) {
            post(parentWindow, { type: 'error', code: 'unknown-library', message: id });
        });

        win.document.open();
        win.document.write(built.html);
        win.document.close();
    }

    function start (win) {
        // aberta fora de um iframe, não há pai com quem conversar
        if (!win || win.parent === win) {
            return;
        }

        const parentWindow = win.parent;
        let rendering = false;

        win.addEventListener('message', function (event) {
            if (rendering || event.source !== parentWindow) {
                return;
            }

            const payload = parsePanelRenderMessage(event.data);

            if (payload) {
                rendering = true;
                render(win, parentWindow, buildPanelDocument(payload));
            }
        });

        post(parentWindow, { type: 'frame-ready', protocols: SUPPORTED_PROTOCOLS.slice() });
    }

    return {
        PANEL_PROTOCOL_VERSION: PANEL_PROTOCOL_VERSION,
        LIBRARIES: LIBRARIES,
        parsePanelRenderMessage: parsePanelRenderMessage,
        replaceLibraries: replaceLibraries,
        injectBridge: injectBridge,
        buildPanelDocument: buildPanelDocument,
        panelBridge: panelBridge,
        start: start
    };
});
