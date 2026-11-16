/**
 * AuraCalc — Modern Scientific Calculator Engine
 * Features:
 * - Robust Mathematical Parser (Shunting-yard Algorithm)
 * - Standard & Scientific Modes with Angle Unit (DEG/RAD)
 * - Memory Storage (MC, MR, M+, M-, MS)
 * - Persistent History & Themes via LocalStorage
 * - Synthesized Audio Feedback (Web Audio API)
 * - Keyboard navigation & Visual keypress highlights
 */

class CalculatorApp {
  constructor() {
    this.expression = '';
    this.currentInput = '0';
    this.lastEvaluated = false;
    this.angleUnit = 'DEG'; // 'DEG' or 'RAD'
    this.memory = 0;
    this.soundEnabled = true;
    this.history = [];

    this.audioCtx = null;

    this.initElements();
    this.loadState();
    this.bindEvents();
    this.updateDisplay();
    this.renderHistory();
  }

  /* --------------------------------------------------------------------------
     Initialization & DOM Bindings
     -------------------------------------------------------------------------- */
  initElements() {
    this.exprDisplay = document.getElementById('expression-display');
    this.resultDisplay = document.getElementById('result-display');
    this.badgeMode = document.getElementById('badge-mode');
    this.badgeMemory = document.getElementById('badge-memory');
    this.btnAngleUnit = document.getElementById('btn-angle-unit');

    this.modeStd = document.getElementById('mode-std');
    this.modeSci = document.getElementById('mode-sci');
    this.keypadSci = document.getElementById('keypad-scientific');

    this.btnSound = document.getElementById('btn-sound');
    this.soundOnIcon = this.btnSound.querySelector('.sound-on-icon');
    this.soundOffIcon = this.btnSound.querySelector('.sound-off-icon');

    this.btnTheme = document.getElementById('btn-theme');
    this.themeDropdown = document.getElementById('theme-dropdown');
    this.themeOptions = document.querySelectorAll('.theme-opt');

    this.historyPanel = document.getElementById('history-panel');
    this.btnHistoryToggle = document.getElementById('btn-history-toggle');
    this.btnCloseHistory = document.getElementById('btn-close-history');
    this.btnClearHistory = document.getElementById('btn-clear-history');
    this.historyList = document.getElementById('history-list');

    this.btnCopy = document.getElementById('btn-copy');
    this.toast = document.getElementById('toast');
  }

  loadState() {
    // Load theme
    const savedTheme = localStorage.getItem('auracalc_theme') || 'dark';
    this.setTheme(savedTheme);

    // Load sound preference
    const savedSound = localStorage.getItem('auracalc_sound');
    if (savedSound !== null) {
      this.soundEnabled = savedSound === 'true';
    }
    this.updateSoundIcon();

    // Load mode (Standard vs Scientific)
    const savedMode = localStorage.getItem('auracalc_mode') || 'standard';
    this.setCalculatorMode(savedMode);

    // Load Angle Unit
    const savedAngle = localStorage.getItem('auracalc_angle') || 'DEG';
    this.angleUnit = savedAngle;
    if (this.badgeMode) this.badgeMode.textContent = this.angleUnit;
    if (this.btnAngleUnit) this.btnAngleUnit.textContent = this.angleUnit === 'DEG' ? 'RAD' : 'DEG';

    // Load Memory
    const savedMem = localStorage.getItem('auracalc_memory');
    if (savedMem) {
      this.memory = parseFloat(savedMem) || 0;
      this.updateMemoryBadge();
    }

    // Load History
    const savedHistory = localStorage.getItem('auracalc_history');
    if (savedHistory) {
      try {
        this.history = JSON.parse(savedHistory);
      } catch (e) {
        this.history = [];
      }
    }
  }

  bindEvents() {
    // Mode toggles
    this.modeStd.addEventListener('click', () => this.setCalculatorMode('standard'));
    this.modeSci.addEventListener('click', () => this.setCalculatorMode('scientific'));

    // Sound toggle
    this.btnSound.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      localStorage.setItem('auracalc_sound', this.soundEnabled);
      this.updateSoundIcon();
      if (this.soundEnabled) this.playSound('click');
      this.showToast(this.soundEnabled ? 'Sound ON' : 'Sound OFF');
    });

    // Theme selector
    this.btnTheme.addEventListener('click', (e) => {
      e.stopPropagation();
      this.themeDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!this.themeDropdown.contains(e.target) && e.target !== this.btnTheme) {
        this.themeDropdown.classList.remove('show');
      }
    });

    this.themeOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        const theme = opt.getAttribute('data-set-theme');
        this.setTheme(theme);
        this.themeDropdown.classList.remove('show');
        this.playSound('click');
      });
    });

    // History drawer controls
    this.btnHistoryToggle.addEventListener('click', () => {
      this.historyPanel.classList.toggle('collapsed');
      this.playSound('click');
    });

    this.btnCloseHistory.addEventListener('click', () => {
      this.historyPanel.classList.add('collapsed');
    });

    this.btnClearHistory.addEventListener('click', () => {
      this.history = [];
      localStorage.removeItem('auracalc_history');
      this.renderHistory();
      this.playSound('action');
      this.showToast('History cleared');
    });

    // Copy result
    this.btnCopy.addEventListener('click', () => this.copyResult());
    this.resultDisplay.addEventListener('click', () => this.copyResult());

    // Button clicks in keypad
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleButtonPress(btn);
      });
    });

    // Physical Keyboard handling
    window.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
  }

  /* --------------------------------------------------------------------------
     Button & Keypad Actions
     -------------------------------------------------------------------------- */
  handleButtonPress(btn) {
    if (btn.hasAttribute('data-num')) {
      const num = btn.getAttribute('data-num');
      this.inputDigit(num);
      this.playSound('num');
    } else if (btn.hasAttribute('data-op')) {
      const op = btn.getAttribute('data-op');
      this.inputOperator(op);
      this.playSound('op');
    } else if (btn.hasAttribute('data-action')) {
      const action = btn.getAttribute('data-action');
      this.handleAction(action, btn);
    }
  }

  handleAction(action, btn) {
    switch (action) {
      case 'clear-all':
        this.clearAll();
        this.playSound('action');
        break;
      case 'clear-entry':
        this.clearEntry();
        this.playSound('action');
        break;
      case 'backspace':
        this.backspace();
        this.playSound('click');
        break;
      case 'calculate':
        this.calculate();
        this.playSound('equals');
        break;
      case 'negate':
        this.toggleSign();
        this.playSound('click');
        break;
      case 'percent':
        this.inputPercent();
        this.playSound('op');
        break;
      case 'insert':
        const val = btn.getAttribute('data-value');
        this.insertToken(val);
        this.playSound('click');
        break;
      case 'toggle-angle':
        this.toggleAngleUnit();
        this.playSound('click');
        break;

      // Scientific functions
      case 'sin':
      case 'cos':
      case 'tan':
      case 'asin':
      case 'acos':
      case 'atan':
      case 'ln':
      case 'log':
      case 'sqrt':
        this.applyFunction(action);
        this.playSound('op');
        break;
      case 'sqr':
        this.insertPower(2);
        this.playSound('op');
        break;
      case 'cube':
        this.insertPower(3);
        this.playSound('op');
        break;
      case 'power-y':
        this.inputOperator('^');
        this.playSound('op');
        break;
      case 'reciprocal':
        this.applyReciprocal();
        this.playSound('op');
        break;
      case 'factorial':
        this.applyFactorial();
        this.playSound('op');
        break;
      case 'const-pi':
        this.insertConstant('π', Math.PI);
        this.playSound('num');
        break;
      case 'const-e':
        this.insertConstant('e', Math.E);
        this.playSound('num');
        break;

      // Memory
      case 'mc':
        this.memoryClear();
        break;
      case 'mr':
        this.memoryRecall();
        break;
      case 'm-plus':
        this.memoryAdd();
        break;
      case 'm-minus':
        this.memorySubtract();
        break;
      case 'ms':
        this.memoryStore();
        break;
    }
  }

  /* --------------------------------------------------------------------------
     Core Input Logic
     -------------------------------------------------------------------------- */
  inputDigit(digit) {
    if (this.lastEvaluated) {
      this.currentInput = '';
      this.expression = '';
      this.lastEvaluated = false;
    }

    if (digit === '.') {
      if (this.currentInput.includes('.')) return;
      if (this.currentInput === '' || this.currentInput === '0') {
        this.currentInput = '0.';
      } else {
        this.currentInput += '.';
      }
    } else {
      if (this.currentInput === '0') {
        this.currentInput = digit;
      } else {
        this.currentInput += digit;
      }
    }

    this.updateDisplay();
  }

  inputOperator(op) {
    if (this.lastEvaluated) {
      this.expression = this.currentInput + ' ' + op + ' ';
      this.currentInput = '';
      this.lastEvaluated = false;
      this.updateDisplay();
      return;
    }

    if (this.currentInput === '') {
      if (this.expression.length > 0) {
        // Replace last operator
        this.expression = this.expression.trimEnd().replace(/[\+\-×÷\^]$/, op) + ' ';
      }
      this.updateDisplay();
      return;
    }

    this.expression += this.currentInput + ' ' + op + ' ';
    this.currentInput = '';
    this.updateDisplay();
  }

  insertToken(token) {
    if (this.lastEvaluated) {
      this.expression = '';
      this.lastEvaluated = false;
    }
    if (token === '(') {
      if (this.currentInput !== '' && this.currentInput !== '0') {
        this.expression += this.currentInput + ' × ';
      }
      this.expression += '( ';
      this.currentInput = '';
    } else if (token === ')') {
      if (this.currentInput !== '') {
        this.expression += this.currentInput + ' ';
        this.currentInput = '';
      }
      this.expression += ') ';
    }
    this.updateDisplay();
  }

  insertConstant(symbol, val) {
    if (this.lastEvaluated) {
      this.expression = '';
      this.lastEvaluated = false;
    }
    this.currentInput = String(val);
    this.updateDisplay();
  }

  insertPower(exponent) {
    if (this.currentInput === '' && this.lastEvaluated) {
      this.expression = `${this.resultDisplay.textContent} ^ ${exponent}`;
      this.calculate();
      return;
    }
    const val = this.currentInput === '' ? '0' : this.currentInput;
    this.expression += `${val} ^ ${exponent} `;
    this.currentInput = '';
    this.updateDisplay();
  }

  applyFunction(fn) {
    const rawVal = this.currentInput !== '' ? this.currentInput : '0';
    let num = parseFloat(rawVal);
    if (isNaN(num)) return;

    let res;
    // Degree/Radian conversion
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;

    try {
      switch (fn) {
        case 'sin':
          res = Math.sin(this.angleUnit === 'DEG' ? toRad(num) : num);
          break;
        case 'cos':
          res = Math.cos(this.angleUnit === 'DEG' ? toRad(num) : num);
          break;
        case 'tan':
          if (this.angleUnit === 'DEG' && (Math.abs(num) % 180 === 90)) {
            throw new Error('Undefined');
          }
          res = Math.tan(this.angleUnit === 'DEG' ? toRad(num) : num);
          break;
        case 'asin':
          if (num < -1 || num > 1) throw new Error('Domain Error');
          res = Math.asin(num);
          if (this.angleUnit === 'DEG') res = toDeg(res);
          break;
        case 'acos':
          if (num < -1 || num > 1) throw new Error('Domain Error');
          res = Math.acos(num);
          if (this.angleUnit === 'DEG') res = toDeg(res);
          break;
        case 'atan':
          res = Math.atan(num);
          if (this.angleUnit === 'DEG') res = toDeg(res);
          break;
        case 'ln':
          if (num <= 0) throw new Error('Domain Error');
          res = Math.log(num);
          break;
        case 'log':
          if (num <= 0) throw new Error('Domain Error');
          res = Math.log10(num);
          break;
        case 'sqrt':
          if (num < 0) throw new Error('Invalid Input');
          res = Math.sqrt(num);
          break;
      }

      res = this.formatFloat(res);
      this.currentInput = String(res);
      this.updateDisplay();
    } catch (e) {
      this.currentInput = e.message || 'Error';
      this.updateDisplay();
    }
  }

  applyReciprocal() {
    const num = parseFloat(this.currentInput || '0');
    if (num === 0) {
      this.currentInput = 'Cannot divide by 0';
    } else {
      this.currentInput = String(this.formatFloat(1 / num));
    }
    this.updateDisplay();
  }

  applyFactorial() {
    const num = parseFloat(this.currentInput || '0');
    if (num < 0 || !Number.isInteger(num)) {
      this.currentInput = 'Invalid Input';
    } else if (num > 170) {
      this.currentInput = 'Infinity';
    } else {
      let fact = 1;
      for (let i = 2; i <= num; i++) fact *= i;
      this.currentInput = String(fact);
    }
    this.updateDisplay();
  }

  toggleSign() {
    if (this.currentInput === '' || this.currentInput === '0') return;
    if (this.currentInput.startsWith('-')) {
      this.currentInput = this.currentInput.substring(1);
    } else {
      this.currentInput = '-' + this.currentInput;
    }
    this.updateDisplay();
  }

  inputPercent() {
    const num = parseFloat(this.currentInput || '0');
    this.currentInput = String(this.formatFloat(num / 100));
    this.updateDisplay();
  }

  backspace() {
    if (this.lastEvaluated) {
      this.expression = '';
      this.lastEvaluated = false;
      return;
    }
    if (this.currentInput.length > 1) {
      this.currentInput = this.currentInput.slice(0, -1);
    } else {
      this.currentInput = '0';
    }
    this.updateDisplay();
  }

  clearEntry() {
    this.currentInput = '0';
    this.updateDisplay();
  }

  clearAll() {
    this.expression = '';
    this.currentInput = '0';
    this.lastEvaluated = false;
    this.updateDisplay();
  }

  toggleAngleUnit() {
    this.angleUnit = this.angleUnit === 'DEG' ? 'RAD' : 'DEG';
    localStorage.setItem('auracalc_angle', this.angleUnit);
    this.badgeMode.textContent = this.angleUnit;
    this.btnAngleUnit.textContent = this.angleUnit === 'DEG' ? 'RAD' : 'DEG';
    this.showToast(`Angle unit set to ${this.angleUnit}`);
  }

  /* --------------------------------------------------------------------------
     Mathematical Parser & Calculation
     -------------------------------------------------------------------------- */
  calculate() {
    let fullExpr = this.expression + (this.currentInput !== '' ? this.currentInput : '');
    fullExpr = fullExpr.trim();

    if (!fullExpr) return;

    try {
      const result = this.evaluateExpression(fullExpr);
      const formatted = this.formatFloat(result);

      // Save to history
      this.addToHistory(fullExpr, formatted);

      this.expression = fullExpr + ' =';
      this.currentInput = String(formatted);
      this.lastEvaluated = true;
      this.updateDisplay();
    } catch (err) {
      this.currentInput = err.message || 'Error';
      this.lastEvaluated = true;
      this.updateDisplay();
    }
  }

  evaluateExpression(exprStr) {
    // Standardize symbols
    let sanitized = exprStr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    // Tokenize
    const tokens = this.tokenize(sanitized);
    if (!tokens.length) return 0;

    // Convert to RPN (Reverse Polish Notation) via Shunting-Yard
    const rpn = this.shuntingYard(tokens);

    // Evaluate RPN
    return this.evaluateRPN(rpn);
  }

  tokenize(str) {
    const tokens = [];
    const regex = /\s*([0-9]+\.?[0-9]*|\.?[0-9]+|[\+\-\*\/\^\(\)]|[a-zA-Z]+)\s*/g;
    let match;
    let lastToken = null;

    while ((match = regex.exec(str)) !== null) {
      let token = match[1];

      // Handle unary minus
      if (token === '-') {
        if (lastToken === null || ['+', '-', '*', '/', '^', '('].includes(lastToken)) {
          token = 'u-'; // unary minus
        }
      }

      tokens.push(token);
      lastToken = token;
    }
    return tokens;
  }

  shuntingYard(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    const precedence = {
      '+': 2,
      '-': 2,
      '*': 3,
      '/': 3,
      '^': 4,
      'u-': 5
    };

    const associativity = {
      '+': 'L',
      '-': 'L',
      '*': 'L',
      '/': 'L',
      '^': 'R',
      'u-': 'R'
    };

    for (const token of tokens) {
      if (!isNaN(parseFloat(token))) {
        outputQueue.push(parseFloat(token));
      } else if (token in precedence) {
        const o1 = token;
        while (operatorStack.length > 0) {
          const o2 = operatorStack[operatorStack.length - 1];
          if (o2 in precedence) {
            if (
              (associativity[o1] === 'L' && precedence[o1] <= precedence[o2]) ||
              (associativity[o1] === 'R' && precedence[o1] < precedence[o2])
            ) {
              outputQueue.push(operatorStack.pop());
              continue;
            }
          }
          break;
        }
        operatorStack.push(o1);
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(operatorStack.pop());
        }
        if (operatorStack.length && operatorStack[operatorStack.length - 1] === '(') {
          operatorStack.pop();
        }
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop();
      if (op === '(' || op === ')') {
        throw new Error('Mismatched parentheses');
      }
      outputQueue.push(op);
    }

    return outputQueue;
  }

  evaluateRPN(rpn) {
    const stack = [];

    for (const token of rpn) {
      if (typeof token === 'number') {
        stack.push(token);
      } else if (token === 'u-') {
        const a = stack.pop();
        if (a === undefined) throw new Error('Syntax Error');
        stack.push(-a);
      } else {
        const b = stack.pop();
        const a = stack.pop();
        if (a === undefined || b === undefined) throw new Error('Syntax Error');

        let res;
        switch (token) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) throw new Error('Cannot divide by 0');
            res = a / b;
            break;
          case '^': res = Math.pow(a, b); break;
          default:
            throw new Error(`Unknown operator: ${token}`);
        }
        stack.push(res);
      }
    }

    if (stack.length !== 1) throw new Error('Invalid Expression');
    return stack[0];
  }

  formatFloat(val) {
    if (!Number.isFinite(val)) return val;
    // Fix floating point precision artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004)
    const rounded = parseFloat(val.toPrecision(12));
    return rounded;
  }

  /* --------------------------------------------------------------------------
     Memory Functions
     -------------------------------------------------------------------------- */
  memoryClear() {
    this.memory = 0;
    localStorage.removeItem('auracalc_memory');
    this.updateMemoryBadge();
    this.playSound('action');
    this.showToast('Memory Cleared');
  }

  memoryRecall() {
    this.currentInput = String(this.memory);
    this.lastEvaluated = false;
    this.updateDisplay();
    this.playSound('num');
    this.showToast(`Memory Recalled: ${this.memory}`);
  }

  memoryStore() {
    const val = parseFloat(this.currentInput || '0');
    this.memory = val;
    localStorage.setItem('auracalc_memory', this.memory);
    this.updateMemoryBadge();
    this.playSound('action');
    this.showToast(`Memory Stored: ${this.memory}`);
  }

  memoryAdd() {
    const val = parseFloat(this.currentInput || '0');
    this.memory += val;
    localStorage.setItem('auracalc_memory', this.memory);
    this.updateMemoryBadge();
    this.playSound('op');
    this.showToast(`M+ (${this.memory})`);
  }

  memorySubtract() {
    const val = parseFloat(this.currentInput || '0');
    this.memory -= val;
    localStorage.setItem('auracalc_memory', this.memory);
    this.updateMemoryBadge();
    this.playSound('op');
    this.showToast(`M− (${this.memory})`);
  }

  updateMemoryBadge() {
    if (this.memory !== 0) {
      this.badgeMemory.style.display = 'inline-block';
    } else {
      this.badgeMemory.style.display = 'none';
    }
  }

  /* --------------------------------------------------------------------------
     History Management
     -------------------------------------------------------------------------- */
  addToHistory(expression, result) {
    const item = {
      expression,
      result,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.history.unshift(item);
    if (this.history.length > 50) this.history.pop();
    localStorage.setItem('auracalc_history', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    if (!this.history.length) {
      this.historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
      return;
    }

    this.historyList.innerHTML = this.history.map((item, idx) => `
      <div class="history-item" data-idx="${idx}" title="Click to reuse this result">
        <div class="history-item-expr">${this.escapeHTML(item.expression)} =</div>
        <div class="history-item-res">${this.escapeHTML(String(item.result))}</div>
      </div>
    `).join('');

    this.historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = el.getAttribute('data-idx');
        const selected = this.history[idx];
        if (selected) {
          this.currentInput = String(selected.result);
          this.lastEvaluated = false;
          this.updateDisplay();
          this.playSound('click');
          this.showToast('Result loaded');
        }
      });
    });
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  /* --------------------------------------------------------------------------
     Display & Theme & Mode UI
     -------------------------------------------------------------------------- */
  updateDisplay() {
    this.exprDisplay.textContent = this.expression;
    const text = this.currentInput === '' ? '0' : this.currentInput;
    this.resultDisplay.textContent = text;

    // Dynamic font resizing for long results
    if (text.length > 12) {
      this.resultDisplay.style.fontSize = '1.75rem';
    } else if (text.length > 8) {
      this.resultDisplay.style.fontSize = '2.1rem';
    } else {
      this.resultDisplay.style.fontSize = '2.5rem';
    }
  }

  setCalculatorMode(mode) {
    if (mode === 'scientific') {
      this.keypadSci.classList.add('active');
      this.modeSci.classList.add('active');
      this.modeStd.classList.remove('active');
      localStorage.setItem('auracalc_mode', 'scientific');
    } else {
      this.keypadSci.classList.remove('active');
      this.modeStd.classList.add('active');
      this.modeSci.classList.remove('active');
      localStorage.setItem('auracalc_mode', 'standard');
    }
  }

  setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('auracalc_theme', themeName);
    this.themeOptions.forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-set-theme') === themeName);
    });
  }

  updateSoundIcon() {
    if (this.soundEnabled) {
      this.soundOnIcon.style.display = 'block';
      this.soundOffIcon.style.display = 'none';
    } else {
      this.soundOnIcon.style.display = 'none';
      this.soundOffIcon.style.display = 'block';
    }
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2000);
  }

  async copyResult() {
    const text = this.resultDisplay.textContent;
    if (!text || text === 'Error') return;

    try {
      await navigator.clipboard.writeText(text);
      this.showToast(`Copied ${text} to clipboard!`);
      this.playSound('click');
    } catch (err) {
      // Fallback
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.showToast(`Copied ${text} to clipboard!`);
    }
  }

  /* --------------------------------------------------------------------------
     Web Audio Sound Synthesizer
     -------------------------------------------------------------------------- */
  playSound(type) {
    if (!this.soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'num') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'op') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(580, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'equals') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'action') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {
      // Audio might be blocked by browser policy until user interaction
    }
  }

  /* --------------------------------------------------------------------------
     Keyboard Event Handling
     -------------------------------------------------------------------------- */
  handleKeyboardInput(e) {
    const key = e.key;

    if (key >= '0' && key <= '9') {
      this.inputDigit(key);
      this.flashButton(`[data-num="${key}"]`);
      this.playSound('num');
    } else if (key === '.') {
      this.inputDigit('.');
      this.flashButton('[data-num="."]');
      this.playSound('num');
    } else if (key === '+') {
      this.inputOperator('+');
      this.flashButton('[data-op="+"]');
      this.playSound('op');
    } else if (key === '-') {
      this.inputOperator('-');
      this.flashButton('[data-op="-"]');
      this.playSound('op');
    } else if (key === '*') {
      this.inputOperator('×');
      this.flashButton('[data-op="×"]');
      this.playSound('op');
    } else if (key === '/') {
      e.preventDefault();
      this.inputOperator('÷');
      this.flashButton('[data-op="÷"]');
      this.playSound('op');
    } else if (key === '^') {
      this.inputOperator('^');
      this.playSound('op');
    } else if (key === '(' || key === ')') {
      this.insertToken(key);
      this.playSound('click');
    } else if (key === '%') {
      this.inputPercent();
      this.playSound('op');
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      this.calculate();
      this.flashButton('[data-action="calculate"]');
      this.playSound('equals');
    } else if (key === 'Backspace') {
      this.backspace();
      this.flashButton('[data-action="backspace"]');
      this.playSound('click');
    } else if (key === 'Escape') {
      this.clearAll();
      this.flashButton('[data-action="clear-all"]');
      this.playSound('action');
    }
  }

  flashButton(selector) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.classList.add('keyboard-active');
      setTimeout(() => btn.classList.remove('keyboard-active'), 120);
    }
  }
}

// Instantiate on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  window.calculator = new CalculatorApp();

  // Register PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Running locally without https or server
    });
  }
});
