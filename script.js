/* NeuraCalc — Modern Glassmorphic Scientific Calculator Script */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const expressionDisplay = document.getElementById('expression-display');
    const inputDisplay      = document.getElementById('input-display');
    const themeToggle       = document.getElementById('theme-toggle');
    const angleToggle       = document.getElementById('angle-toggle');
    const sciToggle         = document.getElementById('sci-toggle');
    const calculatorContainer = document.querySelector('.calculator-container');
    const keypad            = document.querySelector('.keypad-layout');

    // --- State ---
    let tokens      = [];
    let lastResult  = null;
    let isEvaluated = false;
    let angleMode   = localStorage.getItem('angleMode') || 'DEG';
    let isScientific = localStorage.getItem('isScientific') === 'true';

    // --- Init ---
    angleToggle.querySelector('span').textContent = angleMode;
    if (isScientific) {
        calculatorContainer.classList.add('scientific-active');
        sciToggle.classList.add('active');
    }
    initTheme();

    function initTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    }

    themeToggle.addEventListener('click', e => {
        createRipple(e, themeToggle);
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });

    sciToggle.addEventListener('click', e => {
        createRipple(e, sciToggle);
        isScientific = !isScientific;
        localStorage.setItem('isScientific', isScientific);
        calculatorContainer.classList.toggle('scientific-active', isScientific);
        sciToggle.classList.toggle('active', isScientific);
    });

    angleToggle.addEventListener('click', e => {
        createRipple(e, angleToggle);
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        localStorage.setItem('angleMode', angleMode);
        angleToggle.querySelector('span').textContent = angleMode;
        if (tokens.length > 0) evaluate(false);
    });

    function createRipple(event, button) {
        button.querySelectorAll('.ripple').forEach(r => r.remove());
        const circle   = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius   = diameter / 2;
        const rect     = button.getBoundingClientRect();
        const clientX  = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const clientY  = event.clientY || (event.touches && event.touches[0].clientY) || 0;
        circle.style.width  = circle.style.height = diameter + 'px';
        circle.style.left   = (clientX - rect.left - radius) + 'px';
        circle.style.top    = (clientY - rect.top  - radius) + 'px';
        circle.classList.add('ripple');
        button.appendChild(circle);
    }

    keypad.addEventListener('click', e => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        createRipple(e, btn);
        const action = btn.dataset.action;
        const val    = btn.dataset.val;
        if (val !== undefined && action === undefined) {
            handleAction('num', val);
        } else if (action) {
            handleAction(action, val);
        }
    });

    function handleAction(action, val) {
        if (isEvaluated && action !== 'equals') {
            const startsNew = ['num','pi','e','sin','cos','tan','asin','acos','atan','sqrt','log','ln','open-bracket'].includes(action);
            const continues = ['add','subtract','multiply','divide','power','factorial','percent'].includes(action);
            if (startsNew) {
                tokens = [];
            } else if (continues) {
                tokens = (lastResult !== null && isFinite(lastResult) && !isNaN(lastResult))
                    ? [{ type: 'number', value: String(lastResult) }]
                    : [];
            }
            isEvaluated = false;
        }

        switch (action) {
            case 'num':           inputDigit(val);      break;
            case 'add':           inputOperator('+');   break;
            case 'subtract':      inputOperator('-');   break;
            case 'multiply':      inputOperator('*');   break;
            case 'divide':        inputOperator('/');   break;
            case 'negate':        inputNegate();        break;
            case 'clear':         clearAll();           break;
            case 'delete':        deleteLast();         break;
            case 'percent':       inputPercent();       break;
            case 'equals':        evaluate(true);       break;
            case 'sin':
            case 'cos':
            case 'tan':
            case 'asin':
            case 'acos':
            case 'atan':
            case 'log':
            case 'ln':
            case 'sqrt':          inputFunction(action); break;
            case 'square':        inputSquare();         break;
            case 'power':         inputOperator('^');   break;
            case 'factorial':     inputFactorial();     break;
            case 'pi':            inputConstant('pi');  break;
            case 'e':             inputConstant('e');   break;
            case 'open-bracket':  inputOpenBracket();   break;
            case 'close-bracket': inputCloseBracket();  break;
        }

        updateDisplays();
        if (tokens.length > 0 && !isEvaluated) {
            evaluate(false);
        }
    }

    function getLastToken() { return tokens[tokens.length - 1] || null; }

    function inputDigit(digit) {
        const last = getLastToken();
        if (last && last.type === 'number') {
            if (last.value.replace(/[.\-]/g, '').length >= 15) return;
            if (digit === '.') {
                if (!last.value.includes('.')) last.value += '.';
            } else {
                if (last.value === '0')       last.value = digit;
                else if (last.value === '-0') last.value = '-' + digit;
                else                          last.value += digit;
            }
        } else if (last && (last.type === 'constant' || last.type === 'close-bracket' || last.type === 'factorial' || last.type === 'percent')) {
            tokens.push({ type: 'operator', value: '*' });
            tokens.push({ type: 'number', value: digit === '.' ? '0.' : digit });
        } else {
            tokens.push({ type: 'number', value: digit === '.' ? '0.' : digit });
        }
    }

    function inputOperator(op) {
        const last = getLastToken();
        if (!last) {
            if (op === '-') tokens.push({ type: 'number', value: '-' });
            return;
        }
        if (last.type === 'operator') {
            if (tokens.length === 1 && last.value === '-') {
                if (op === '-') return;
                tokens.pop();
            } else {
                last.value = op;
            }
        } else if (last.type === 'open-bracket' || last.type === 'function') {
            if (op === '-') tokens.push({ type: 'number', value: '-' });
        } else if (last.type === 'number' && last.value === '-') {
            if (op !== '-') {
                tokens.pop();
                const nl = getLastToken();
                if (nl && nl.type === 'operator') nl.value = op;
            }
        } else {
            tokens.push({ type: 'operator', value: op });
        }
    }

    function inputNegate() {
        const last = getLastToken();
        if (last && (last.type === 'number' || last.type === 'constant')) {
            last.value = last.value.startsWith('-') ? last.value.slice(1) : '-' + last.value;
        } else {
            tokens.push({ type: 'number', value: '-' });
        }
    }

    function inputFunction(func) {
        const last = getLastToken();
        if (last && (last.type === 'number' || last.type === 'constant' || last.type === 'close-bracket' || last.type === 'factorial')) {
            tokens.push({ type: 'operator', value: '*' });
        }
        tokens.push({ type: 'function', value: func });
    }

    function inputConstant(name) {
        const last = getLastToken();
        if (last && (last.type === 'number' || last.type === 'constant' || last.type === 'close-bracket' || last.type === 'factorial')) {
            tokens.push({ type: 'operator', value: '*' });
        }
        tokens.push({ type: 'constant', value: name });
    }

    function inputOpenBracket() {
        const last = getLastToken();
        if (last && (last.type === 'number' || last.type === 'constant' || last.type === 'close-bracket' || last.type === 'factorial')) {
            tokens.push({ type: 'operator', value: '*' });
        }
        tokens.push({ type: 'open-bracket', value: '(' });
    }

    function inputCloseBracket() {
        const last = getLastToken();
        let opens = 0, closes = 0;
        tokens.forEach(t => {
            if (t.type === 'open-bracket' || t.type === 'function') opens++;
            if (t.type === 'close-bracket') closes++;
        });
        if (opens > closes && last && (last.type === 'number' || last.type === 'constant' || last.type === 'close-bracket' || last.type === 'factorial')) {
            tokens.push({ type: 'close-bracket', value: ')' });
        }
    }

    function inputFactorial() {
        const last = getLastToken();
        if (last && (last.type === 'number' || last.type === 'constant' || last.type === 'close-bracket')) {
            tokens.push({ type: 'factorial', value: '!' });
        }
    }

    function inputPercent() {
        const last = getLastToken();
        if (last && (last.type === 'number' || last.type === 'constant' || last.type === 'close-bracket')) {
            tokens.push({ type: 'percent', value: '%' });
        }
    }

    function inputSquare() {
        const last = getLastToken();
        if (last && (last.type === 'number' || last.type === 'constant' || last.type === 'close-bracket' || last.type === 'factorial')) {
            tokens.push({ type: 'operator', value: '^' });
            tokens.push({ type: 'number',   value: '2' });
        }
    }

    function clearAll() {
        tokens = []; lastResult = null; isEvaluated = false;
        inputDisplay.textContent = '0';
        inputDisplay.className   = 'input-display';
        expressionDisplay.textContent = '';
    }

    function deleteLast() {
        if (isEvaluated) { clearAll(); return; }
        const last = getLastToken();
        if (!last) return;
        if (last.type === 'number') {
            last.value = last.value.slice(0, -1);
            if (last.value === '' || last.value === '-') tokens.pop();
        } else {
            tokens.pop();
        }
    }

    function updateDisplays() {
        if (tokens.length === 0) {
            expressionDisplay.textContent = '';
            if (!isEvaluated) {
                inputDisplay.textContent = '0';
                inputDisplay.className   = 'input-display';
            }
            return;
        }
        let exprStr = '';
        tokens.forEach(t => {
            let v = t.value;
            if      (v === '*')    v = '×';
            else if (v === '/')    v = '÷';
            else if (v === 'pi')   v = 'π';
            else if (v === 'asin') v = 'sin⁻¹';
            else if (v === 'acos') v = 'cos⁻¹';
            else if (v === 'atan') v = 'tan⁻¹';
            else if (t.type === 'function') v = v + '(';
            if (t.type === 'operator') exprStr += ' ' + v + ' ';
            else                       exprStr += v;
        });
        expressionDisplay.textContent = exprStr.trim();

        if (!isEvaluated) {
            const last = getLastToken();
            if (last && last.type === 'number') {
                inputDisplay.textContent = last.value;
            } else if (last && last.type === 'constant') {
                inputDisplay.textContent = last.value === 'pi' ? 'π' : last.value;
            } else if (lastResult !== null && isFinite(lastResult) && !isNaN(lastResult)) {
                inputDisplay.textContent = formatResult(lastResult);
            }
            adjustFontSize();
        }
    }

    function adjustFontSize() {
        const len = inputDisplay.textContent.length;
        inputDisplay.className = 'input-display';
        if      (len > 16) inputDisplay.classList.add('very-long-input');
        else if (len > 10) inputDisplay.classList.add('long-input');
    }

    // ---- Parser ----

    function preprocess(tokenList) {
        const out = [];
        for (let i = 0; i < tokenList.length; i++) {
            const curr = tokenList[i];
            const prev = out.length > 0 ? out[out.length - 1] : null;

            if (prev) {
                const prevIsVal = ['number','close-bracket','factorial','percent'].includes(prev.type);
                const currIsVal = (curr.type === 'number' && !curr.value.startsWith('-'))
                                  || curr.type === 'constant'
                                  || curr.type === 'function'
                                  || curr.type === 'open-bracket';
                if (prevIsVal && currIsVal) out.push({ type: 'operator', value: '*' });
            }

            if (curr.type === 'constant') {
                const raw = curr.value.replace(/^-/, '');
                let num = (raw === 'pi') ? Math.PI : Math.E;
                if (curr.value.startsWith('-')) num = -num;
                out.push({ type: 'number', value: String(num) });
            } else if (curr.type === 'function') {
                out.push({ type: 'function',     value: curr.value });
                out.push({ type: 'open-bracket', value: '(' });
            } else {
                out.push({ ...curr });
            }
        }
        return out;
    }

    function getBalancedTokens(tokenList) {
        const balanced = [...tokenList];
        let opens = 0, closes = 0;
        balanced.forEach(t => {
            if (t.type === 'open-bracket' || t.type === 'function') opens++;
            if (t.type === 'close-bracket') closes++;
        });
        while (closes < opens) {
            balanced.push({ type: 'close-bracket', value: ')' });
            closes++;
        }
        return balanced;
    }

    function shuntingYard(tokenList) {
        const output = [], opStack = [];
        const PREC = { '+': 2, '-': 2, '*': 3, '/': 3, '^': 4, 'u-': 5 };
        const RIGHT = new Set(['^', 'u-']);

        for (let i = 0; i < tokenList.length; i++) {
            const token = tokenList[i];

            if (token.type === 'number') {
                output.push(token);
            } else if (token.type === 'function') {
                opStack.push(token);
            } else if (token.type === 'operator') {
                let op = token.value;
                if (op === '-') {
                    const prev = i > 0 ? tokenList[i - 1] : null;
                    if (!prev || prev.type === 'operator' || prev.type === 'open-bracket') op = 'u-';
                }
                while (opStack.length > 0) {
                    const top = opStack[opStack.length - 1];
                    if (top.type === 'open-bracket') break;
                    if (top.type === 'function') { output.push(opStack.pop()); continue; }
                    if (top.type === 'operator') {
                        const pOp = PREC[op] || 0, pTop = PREC[top.value] || 0;
                        if (RIGHT.has(op) ? pOp < pTop : pOp <= pTop) { output.push(opStack.pop()); continue; }
                    }
                    break;
                }
                opStack.push({ type: 'operator', value: op });
            } else if (token.type === 'open-bracket') {
                opStack.push(token);
            } else if (token.type === 'close-bracket') {
                let found = false;
                while (opStack.length > 0) {
                    const top = opStack[opStack.length - 1];
                    if (top.type === 'open-bracket') { opStack.pop(); found = true; break; }
                    output.push(opStack.pop());
                }
                if (!found) throw new Error('Parentheses mismatch');
                if (opStack.length > 0 && opStack[opStack.length - 1].type === 'function') {
                    output.push(opStack.pop());
                }
            } else if (token.type === 'factorial') {
                output.push({ type: 'postfix', value: '!' });
            } else if (token.type === 'percent') {
                output.push({ type: 'postfix', value: '%' });
            }
        }

        while (opStack.length > 0) {
            const top = opStack.pop();
            if (top.type === 'open-bracket') throw new Error('Parentheses mismatch');
            output.push(top);
        }
        return output;
    }

    function evaluateRPN(rpn) {
        const stack = [];
        for (const token of rpn) {
            if (token.type === 'number') {
                const n = parseFloat(token.value);
                if (isNaN(n)) throw new Error('Invalid number');
                stack.push(n);
            } else if (token.type === 'operator') {
                const op = token.value;
                if (op === 'u-') {
                    if (stack.length < 1) throw new Error('Invalid expression');
                    stack.push(-stack.pop());
                } else {
                    if (stack.length < 2) throw new Error('Invalid expression');
                    const b = stack.pop(), a = stack.pop();
                    switch (op) {
                        case '+': stack.push(a + b); break;
                        case '-': stack.push(a - b); break;
                        case '*': stack.push(a * b); break;
                        case '/':
                            if (b === 0) throw new Error('Div by zero');
                            stack.push(a / b); break;
                        case '^': stack.push(Math.pow(a, b)); break;
                        default: throw new Error('Unknown operator');
                    }
                }
            } else if (token.type === 'postfix') {
                if (stack.length < 1) throw new Error('Invalid expression');
                const x = stack.pop();
                if (token.value === '!') {
                    if (x < 0 || !Number.isInteger(x) || x > 170) throw new Error('Math Error');
                    stack.push(factorial(x));
                } else if (token.value === '%') {
                    stack.push(x / 100);
                }
            } else if (token.type === 'function') {
                if (stack.length < 1) throw new Error('Invalid expression');
                const x = stack.pop();
                const toRad = angleMode === 'DEG' ? x * Math.PI / 180 : x;
                let res;
                switch (token.value) {
                    case 'sin':  res = Math.sin(toRad); break;
                    case 'cos':  res = Math.cos(toRad); break;
                    case 'tan':
                        if (angleMode === 'DEG' && Math.abs(x % 180) === 90) throw new Error('Undefined');
                        res = Math.tan(toRad); break;
                    // Inverse trig — input is a ratio, output is angle in DEG or RAD
                    case 'asin':
                        if (x < -1 || x > 1) throw new Error('Math Error');
                        res = Math.asin(x);
                        if (angleMode === 'DEG') res = res * 180 / Math.PI;
                        break;
                    case 'acos':
                        if (x < -1 || x > 1) throw new Error('Math Error');
                        res = Math.acos(x);
                        if (angleMode === 'DEG') res = res * 180 / Math.PI;
                        break;
                    case 'atan':
                        res = Math.atan(x);
                        if (angleMode === 'DEG') res = res * 180 / Math.PI;
                        break;
                    case 'log':
                        if (x <= 0) throw new Error('Math Error');
                        res = Math.log10(x); break;
                    case 'ln':
                        if (x <= 0) throw new Error('Math Error');
                        res = Math.log(x); break;
                    case 'sqrt':
                        if (x < 0) throw new Error('Math Error');
                        res = Math.sqrt(x); break;
                    default: throw new Error('Unknown function: ' + token.value);
                }
                stack.push(res);
            }
        }
        if (stack.length !== 1) throw new Error('Invalid expression');
        return stack[0];
    }

    function factorial(n) {
        if (n === 0 || n === 1) return 1;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    }

    function formatResult(num) {
        if (!isFinite(num) || isNaN(num)) return 'Error';
        const rounded = parseFloat(num.toPrecision(12));
        if (Math.abs(rounded) >= 1e15 || (Math.abs(rounded) < 1e-9 && rounded !== 0)) {
            return rounded.toExponential(6);
        }
        const str = rounded.toString();
        if (str.includes('.') && str.split('.')[1].length > 10) {
            return parseFloat(num.toFixed(10)).toString();
        }
        return str;
    }

    function evaluate(isFinal) {
        if (tokens.length === 0) return;
        if (tokens.length === 1 && tokens[0].value === '-') return;
        try {
            const balanced     = getBalancedTokens(tokens);
            const preprocessed = preprocess(balanced);
            const rpn          = shuntingYard(preprocessed);
            const result       = evaluateRPN(rpn);
            lastResult = result;
            if (isFinal) {
                inputDisplay.textContent = formatResult(result);
                isEvaluated = true;
                tokens = [];
                adjustFontSize();
            }
        } catch (err) {
            lastResult = null;
            if (isFinal) {
                inputDisplay.textContent = err.message || 'Error';
                isEvaluated = true;
                adjustFontSize();
            }
        }
    }

    // ---- Keyboard ----
    const keyMap = {
        '0':{ action:'num',val:'0' },'1':{ action:'num',val:'1' },'2':{ action:'num',val:'2' },
        '3':{ action:'num',val:'3' },'4':{ action:'num',val:'4' },'5':{ action:'num',val:'5' },
        '6':{ action:'num',val:'6' },'7':{ action:'num',val:'7' },'8':{ action:'num',val:'8' },
        '9':{ action:'num',val:'9' },'.':{ action:'num',val:'.' },
        '+':{ action:'add' },'-':{ action:'subtract' },'*':{ action:'multiply' },
        'x':{ action:'multiply' },'X':{ action:'multiply' },'/':{ action:'divide' },
        '%':{ action:'percent' },'(':{ action:'open-bracket' },')':{ action:'close-bracket' },
        '^':{ action:'power' },'!':{ action:'factorial' },
        'Enter':{ action:'equals' },'=':{ action:'equals' },
        'Backspace':{ action:'delete' },'Escape':{ action:'clear' },
        'Delete':{ action:'clear' },'c':{ action:'clear' },'C':{ action:'clear' }
    };

    document.addEventListener('keydown', e => {
        const mapping = keyMap[e.key];
        if (!mapping) return;
        e.preventDefault();
        simulateButtonPress(mapping);
        handleAction(mapping.action, mapping.val);
    });

    function simulateButtonPress({ action, val }) {
        let sel = '';
        if      (action === 'num')      sel = `.btn-num[data-val="${val}"]`;
        else if (action === 'add')      sel = `.btn-op[data-action="add"]`;
        else if (action === 'subtract') sel = `.btn-op[data-action="subtract"]`;
        else if (action === 'multiply') sel = `.btn-op[data-action="multiply"]`;
        else if (action === 'divide')   sel = `.btn-op[data-action="divide"]`;
        else                            sel = `.btn[data-action="${action}"]`;
        const el = document.querySelector(sel);
        if (el) {
            el.classList.add('keyboard-active');
            setTimeout(() => el.classList.remove('keyboard-active'), 120);
        }
    }

    // ---- Floating Math Formulas Canvas ----
    (function initMathCanvas() {
        const canvas = document.getElementById('math-bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Full math formulas — famous equations, calculus, algebra, trig
        const FORMULAS = [
            // Famous equations
            'E = mc²',
            'eⁱᵖ + 1 = 0',
            'a² + b² = c²',
            'F = ma',
            // Calculus
            'd/dx(xⁿ) = nxⁿ⁻¹',
            '∫ eˣ dx = eˣ + C',
            '∫₀^∞ e^(-x²)dx = √π/2',
            "f'(x) = lim[Δx→0] Δf/Δx",
            '∂²u/∂t² = c²∇²u',
            '∇·E = ρ/ε₀',
            // Algebra & Series
            'x = (-b ± √(b²-4ac)) / 2a',
            'Σ 1/n² = π²/6',
            'Σₙ = n(n+1)/2',
            'aⁿ + bⁿ ≠ cⁿ  (n>2)',
            // Trig
            'sin²θ + cos²θ = 1',
            'e^(iθ) = cosθ + i·sinθ',
            'sin(A+B) = sinA·cosB + cosA·sinB',
            // Physics
            'PV = nRT',
            'S = k·ln(Ω)',
            'ΔE·Δt ≥ ℏ/2',
            // Probability & Stats
            'P(A|B) = P(B|A)·P(A)/P(B)',
            'σ² = Σ(x-μ)²/N',
            // Linear Algebra
            'det(AB) = det(A)·det(B)',
            'Ax = λx',
            // Symbols
            '∞', 'π ≈ 3.14159', '√2 ≈ 1.41421',
            'φ = (1+√5)/2', 'e ≈ 2.71828',
        ];

        // Vivid palette against dark glassmorphism
        const COLORS_DARK = [
            '#c084fc', // violet
            '#60a5fa', // sky blue
            '#f472b6', // pink
            '#34d399', // emerald
            '#fbbf24', // amber
            '#a78bfa', // purple
            '#38bdf8', // light blue
            '#fb7185', // rose
        ];
        const COLORS_LIGHT = [
            '#7c3aed', '#1d4ed8', '#db2777',
            '#059669', '#d97706', '#6d28d9', '#0369a1',
        ];

        let W, H, particles = [];

        function getColors() {
            return document.documentElement.getAttribute('data-theme') === 'light'
                ? COLORS_LIGHT : COLORS_DARK;
        }

        function resize() {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }

        function spawnParticle(fromScratch) {
            const colors = getColors();
            // Mix of larger formulas and smaller symbols
            const isFormula = Math.random() > 0.35;
            const size = isFormula
                ? 13 + Math.random() * 14   // 13–27 px for full formulas
                :  9 + Math.random() * 9;   // 9–18 px for single symbols
            const color = colors[Math.floor(Math.random() * colors.length)];
            return {
                x:       fromScratch ? Math.random() * W : W + 200,
                y:       Math.random() * H,
                text:    FORMULAS[Math.floor(Math.random() * FORMULAS.length)],
                color,
                size,
                // More visible: opacity 0.18–0.55
                opacity: 0.18 + Math.random() * 0.37,
                speedX: -(0.10 + Math.random() * 0.32),  // slow leftward drift
                speedY: (Math.random() - 0.5) * 0.14,
                wobbleFreq: 0.0015 + Math.random() * 0.005,
                phase:  Math.random() * Math.PI * 2,
                // subtle tilt
                angle:  (Math.random() - 0.5) * 0.3,
            };
        }

        function init() {
            resize();
            particles = [];
            const count = Math.min(70, Math.floor((W * H) / 16000));
            for (let i = 0; i < count; i++) particles.push(spawnParticle(true));
        }

        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, W, H);
            frame++;

            particles.forEach((p, i) => {
                p.x += p.speedX;
                p.y += p.speedY + Math.sin(frame * p.wobbleFreq + p.phase) * 0.12;

                // Recycle off-screen particles
                const textW = p.text.length * p.size * 0.62;
                if (p.x < -textW - 40) particles[i] = spawnParticle(false);

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.globalAlpha = p.opacity;

                // Soft glow halo behind the text
                ctx.shadowColor = p.color;
                ctx.shadowBlur  = 14;

                ctx.fillStyle    = p.color;
                ctx.font         = `${p.size}px 'Share Tech Mono', 'Courier New', monospace`;
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.text, 0, 0);

                ctx.restore();
            });

            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', () => { resize(); });
        init();
        draw();

        // Re-color particles when theme toggles
        themeToggle.addEventListener('click', () => {
            const colors = getColors();
            particles.forEach(p => {
                p.color = colors[Math.floor(Math.random() * colors.length)];
            });
        });
    })();
});
