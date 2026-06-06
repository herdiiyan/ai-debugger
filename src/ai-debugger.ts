/* eslint-disable no-console */
/**
 * AIDebuggerModal: A standalone, style-isolated modal component for AI Debugger.
 * Uses Shadow DOM to prevent style leakage or interference.
 */
export class AIDebuggerModal {
  private container: HTMLDivElement;
  private shadow: ShadowRoot;
  private resolvePromise: ((value: { action: 'prompt' | 'reproduce', value: string } | null) => void) | null = null;
  private currentAnalysisMarkdown: string = '';
  private resultsResolve: ((value: 'back' | 'close') => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'ai-debugger-modal-host';
    this.shadow = this.container.attachShadow({ mode: 'open' });
    this.render();
    document.body.appendChild(this.container);
  }

  private render() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --primary-color: #3b82f6;
        --bg-color: #ffffff;
        --text-color: #1f2937;
        --border-color: #e5e7eb;
        --overlay-bg: rgba(0, 0, 0, 0.4);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: var(--overlay-bg);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease-in-out;
      }

      .modal-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      .modal-card {
        background: var(--bg-color);
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        width: 90%;
        max-width: 500px;
        padding: 24px;
        transform: translateY(20px);
        transition: transform 0.2s ease-out;
      }

      .modal-overlay.active .modal-card {
        transform: translateY(0);
      }

      h3 {
        margin: 0 0 16px 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-color);
      }

      textarea {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 0.95rem;
        resize: vertical;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
        margin-bottom: 20px;
      }

      textarea:focus {
        border-color: var(--primary-color);
        ring: 2px solid rgba(59, 130, 246, 0.2);
      }

      .button-group {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      button {
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .btn-cancel {
        background: #f3f4f6;
        color: #4b5563;
      }

      .btn-cancel:hover {
        background: #e5e7eb;
      }

      .btn-confirm {
        background: var(--primary-color);
        color: white;
      }

      .btn-confirm:hover {
        background: #2563eb;
      }

      .btn-confirm:disabled {
        background: #93c5fd;
        cursor: not-allowed;
      }

      .btn-download {
        background: #10b981;
        color: white;
      }

      .btn-download:hover {
        background: #059669;
      }

      .settings-toggle {
        font-size: 0.85rem;
        color: #4b5563;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 12px;
        user-select: none;
      }
      .settings-toggle:hover {
        color: var(--primary-color);
      }
      .settings-content {
        display: none;
        background: #f9fafb;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
      }
      .settings-content.active {
        display: block;
      }
      .settings-content label {
        font-size: 0.8rem;
        font-weight: 500;
        color: #4b5563;
        display: block;
        margin-bottom: 6px;
        margin-top: 10px;
      }
      .settings-content label:first-child {
        margin-top: 0;
      }
      .settings-content input, .settings-content select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 0.85rem;
        outline: none;
        box-sizing: border-box;
      }
      .settings-content input:focus, .settings-content select:focus {
        border-color: var(--primary-color);
      }

      .btn-reproduce {
        background: #10b981;
        color: white;
      }
      .btn-reproduce:hover {
        background: #059669;
      }
      .btn-reproduce:disabled {
        background: #a7f3d0;
        cursor: not-allowed;
      }

      /* Float widget style (simulation status) */
      .status-widget {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1f2937;
        color: white;
        border-radius: 9999px;
        padding: 12px 24px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        display: none;
        align-items: center;
        gap: 12px;
        z-index: 1000000;
        font-size: 0.9rem;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
      }
      .status-widget.active {
        display: flex;
      }
      @keyframes slideIn {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .status-dot {
        width: 10px;
        height: 10px;
        background-color: #10b981;
        border-radius: 50%;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      .status-widget button {
        background: #374151;
        color: #d1d5db;
        padding: 4px 10px;
        font-size: 0.75rem;
        border-radius: 6px;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      .status-widget button:hover {
        background: #ef4444;
        color: white;
      }

      /* Loader styles */
      .loader-container {
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
      }
      .loader-container.active {
        display: flex;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f4f6;
        border-top: 4px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Analysis Panel styles */
      .analysis-container {
        display: none;
        flex-direction: column;
        max-height: 400px;
        overflow-y: auto;
        padding: 4px;
        margin-bottom: 20px;
      }
      .analysis-container.active {
        display: flex;
      }
      .analysis-content {
        font-size: 0.95rem;
        line-height: 1.6;
        color: #374151;
      }
      .analysis-content h1, .analysis-content h2, .analysis-content h3 {
        color: #111827;
        margin-top: 16px;
        margin-bottom: 8px;
      }
      .analysis-content h1 { font-size: 1.3rem; border-bottom: 2px solid var(--border-color); padding-bottom: 4px; }
      .analysis-content h2 { font-size: 1.15rem; }
      .analysis-content h3 { font-size: 1rem; }
      .analysis-content pre {
        background: #f3f4f6;
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
        font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        font-size: 0.85rem;
        margin: 12px 0;
        border-left: 4px solid var(--primary-color);
      }
      .analysis-content code {
        background: #f3f4f6;
        padding: 2px 4px;
        border-radius: 4px;
        font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        font-size: 0.85rem;
        color: #eb5757;
      }
      .analysis-content pre code {
        background: transparent;
        padding: 0;
        color: inherit;
        font-size: inherit;
      }
      .analysis-content ul {
        margin: 8px 0;
        padding-left: 20px;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const title = document.createElement('h3');
    title.textContent = 'Jelaskan Issue yang Terjadi';

    // Settings Toggle
    const settingsToggle = document.createElement('div');
    settingsToggle.className = 'settings-toggle';
    settingsToggle.innerHTML = '⚙️ AI Provider & API Settings';

    const settingsContent = document.createElement('div');
    settingsContent.className = 'settings-content';

    // Provider Dropdown
    const providerLabel = document.createElement('label');
    providerLabel.textContent = 'AI Provider:';

    const providerSelect = document.createElement('select');
    providerSelect.className = 'provider-select';

    const providers = [
      { value: 'gemini', text: 'Google Gemini' },
      { value: 'minimax', text: 'MiniMax' },
      { value: 'openai', text: 'OpenAI' },
      { value: 'custom', text: 'Custom Model' }
    ];
    providers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.value;
      opt.textContent = p.text;
      providerSelect.appendChild(opt);
    });
    const savedProvider = localStorage.getItem('ai_debugger_provider') || 'gemini';
    providerSelect.value = savedProvider;

    // Base URL
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Base URL:';
    const urlInput = document.createElement('input');
    urlInput.type = 'text';

    // API Key
    const apiKeyLabel = document.createElement('label');
    apiKeyLabel.textContent = 'API Key:';
    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';

    // Model Name
    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'Model Name:';
    const modelInput = document.createElement('input');
    modelInput.type = 'text';

    const updateFormForProvider = (provider: string) => {
      if (provider === 'gemini') {
        urlLabel.style.display = 'none';
        urlInput.style.display = 'none';
        apiKeyLabel.textContent = 'Gemini API Key:';
        apiKeyInput.placeholder = 'AIzaSy...';
        apiKeyInput.value = localStorage.getItem('ai_debugger_gemini_key') || '';
        modelLabel.textContent = 'Gemini Model:';
        modelInput.placeholder = 'gemini-2.5-flash';
        modelInput.value = localStorage.getItem('ai_debugger_gemini_model') || 'gemini-2.5-flash';
      } else if (provider === 'minimax') {
        urlLabel.style.display = 'block';
        urlLabel.textContent = 'MiniMax Base URL:';
        urlInput.style.display = 'block';
        urlInput.placeholder = 'https://api.minimax.io/v1';
        urlInput.value = localStorage.getItem('ai_debugger_minimax_url') || 'https://api.minimax.io/v1';
        apiKeyLabel.textContent = 'MiniMax API Key:';
        apiKeyInput.placeholder = 'ey...';
        apiKeyInput.value = localStorage.getItem('ai_debugger_minimax_key') || '';
        modelLabel.textContent = 'MiniMax Model:';
        modelInput.placeholder = 'MiniMax-M2.5';
        modelInput.value = localStorage.getItem('ai_debugger_minimax_model') || 'MiniMax-M2.5';
      } else if (provider === 'openai') {
        urlLabel.style.display = 'block';
        urlLabel.textContent = 'OpenAI Base URL:';
        urlInput.style.display = 'block';
        urlInput.placeholder = 'https://api.openai.com/v1';
        urlInput.value = localStorage.getItem('ai_debugger_openai_url') || 'https://api.openai.com/v1';
        apiKeyLabel.textContent = 'OpenAI API Key:';
        apiKeyInput.placeholder = 'sk-...';
        apiKeyInput.value = localStorage.getItem('ai_debugger_openai_key') || '';
        modelLabel.textContent = 'OpenAI Model:';
        modelInput.placeholder = 'gpt-4o-mini';
        modelInput.value = localStorage.getItem('ai_debugger_openai_model') || 'gpt-4o-mini';
      } else { // custom
        urlLabel.style.display = 'block';
        urlLabel.textContent = 'Base URL:';
        urlInput.style.display = 'block';
        urlInput.placeholder = 'https://api.example.com/v1';
        urlInput.value = localStorage.getItem('ai_debugger_custom_url') || '';
        apiKeyLabel.textContent = 'API Key:';
        apiKeyInput.placeholder = 'Enter API Key...';
        apiKeyInput.value = localStorage.getItem('ai_debugger_custom_key') || '';
        modelLabel.textContent = 'Model Name:';
        modelInput.placeholder = 'Enter model name...';
        modelInput.value = localStorage.getItem('ai_debugger_custom_model') || '';
      }
    };

    // Initial load
    updateFormForProvider(savedProvider);

    providerSelect.onchange = () => {
      const provider = providerSelect.value;
      localStorage.setItem('ai_debugger_provider', provider);
      updateFormForProvider(provider);
    };

    urlInput.oninput = () => {
      const provider = providerSelect.value;
      localStorage.setItem(`ai_debugger_${provider}_url`, urlInput.value.trim());
    };

    apiKeyInput.oninput = () => {
      const provider = providerSelect.value;
      localStorage.setItem(`ai_debugger_${provider}_key`, apiKeyInput.value.trim());
    };

    modelInput.oninput = () => {
      const provider = providerSelect.value;
      localStorage.setItem(`ai_debugger_${provider}_model`, modelInput.value.trim());
    };

    settingsContent.appendChild(providerLabel);
    settingsContent.appendChild(providerSelect);
    settingsContent.appendChild(urlLabel);
    settingsContent.appendChild(urlInput);
    settingsContent.appendChild(apiKeyLabel);
    settingsContent.appendChild(apiKeyInput);
    settingsContent.appendChild(modelLabel);
    settingsContent.appendChild(modelInput);

    settingsToggle.onclick = () => {
      settingsContent.classList.toggle('active');
    };

    // Input Area
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Contoh: Saat klik tombol "Submit" tidak terjadi apa-apa...';

    inputGroup.appendChild(textarea);

    // Loader Container
    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'loader-container';
    loaderContainer.innerHTML = `
      <div class="spinner"></div>
      <div class="loader-text" style="font-weight: 500; color: #4b5563;">Menganalisis hasil simulasi...</div>
    `;

    // Analysis Container
    const analysisContainer = document.createElement('div');
    analysisContainer.className = 'analysis-container';
    const analysisContent = document.createElement('div');
    analysisContent.className = 'analysis-content';
    analysisContainer.appendChild(analysisContent);

    // Button Group
    const btnGroup = document.createElement('div');
    btnGroup.className = 'button-group';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-cancel';
    btnCancel.textContent = 'Cancel';
    btnCancel.onclick = () => this.close(null);

    const btnBack = document.createElement('button');
    btnBack.className = 'btn-cancel btn-back';
    btnBack.textContent = 'Kembali';
    btnBack.style.display = 'none';

    const btnPrompt = document.createElement('button');
    btnPrompt.className = 'btn-confirm';
    btnPrompt.textContent = 'Generate Prompt';

    const btnReproduce = document.createElement('button');
    btnReproduce.className = 'btn-confirm btn-reproduce';
    btnReproduce.textContent = 'Auto-Reproduce & Analyze';

    const btnDownload = document.createElement('button');
    btnDownload.className = 'btn-confirm btn-download';
    btnDownload.textContent = 'Download Fix Plan';
    btnDownload.style.display = 'none';

    btnGroup.appendChild(btnCancel);
    btnGroup.appendChild(btnBack);
    btnGroup.appendChild(btnPrompt);
    btnGroup.appendChild(btnReproduce);
    btnGroup.appendChild(btnDownload);

    card.appendChild(title);
    card.appendChild(settingsToggle);
    card.appendChild(settingsContent);
    card.appendChild(inputGroup);
    card.appendChild(loaderContainer);
    card.appendChild(analysisContainer);
    card.appendChild(btnGroup);

    overlay.appendChild(card);

    // Float widget (for simulation)
    const floatWidget = document.createElement('div');
    floatWidget.className = 'status-widget';
    floatWidget.innerHTML = `
      <div class="status-dot"></div>
      <span class="widget-text">🤖 Simulasi: Memulai...</span>
      <button class="btn-cancel-sim" style="padding: 2px 8px; border-radius: 4px; background: #374151; color: #d1d5db; border: none; cursor: pointer; font-size: 0.75rem;">Cancel</button>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    this.shadow.appendChild(floatWidget);

    card.onclick = (e) => e.stopPropagation();
  }

  public setViewState(state: 'input' | 'loading' | 'results', loadingText = '', analysisHtml = '', rawMarkdown = '') {
    const overlay = this.shadow.querySelector('.modal-overlay') as HTMLElement;
    const title = this.shadow.querySelector('h3') as HTMLElement;
    const settingsToggle = this.shadow.querySelector('.settings-toggle') as HTMLElement;
    const settingsContent = this.shadow.querySelector('.settings-content') as HTMLElement;
    const inputGroup = this.shadow.querySelector('.input-group') as HTMLElement;
    const loaderContainer = this.shadow.querySelector('.loader-container') as HTMLElement;
    const loaderText = this.shadow.querySelector('.loader-text') as HTMLElement;
    const analysisContainer = this.shadow.querySelector('.analysis-container') as HTMLElement;
    const analysisContent = this.shadow.querySelector('.analysis-content') as HTMLElement;
    const btnPrompt = this.shadow.querySelector('.btn-confirm:not(.btn-reproduce):not(.btn-download)') as HTMLElement;
    const btnReproduce = this.shadow.querySelector('.btn-reproduce') as HTMLElement;
    const btnDownload = this.shadow.querySelector('.btn-download') as HTMLElement;
    const btnCancel = this.shadow.querySelector('.btn-cancel:not(.btn-back)') as HTMLButtonElement;
    const btnBack = this.shadow.querySelector('.btn-back') as HTMLButtonElement;

    if (state === 'input') {
      overlay.classList.add('active');
      title.style.display = 'block';
      title.textContent = 'Jelaskan Issue yang Terjadi';
      settingsToggle.style.display = 'flex';
      inputGroup.style.display = 'block';
      loaderContainer.classList.remove('active');
      analysisContainer.classList.remove('active');
      btnPrompt.style.display = 'inline-block';
      btnReproduce.style.display = 'inline-block';
      btnDownload.style.display = 'none';
      btnCancel.style.display = 'inline-block';
      btnCancel.textContent = 'Cancel';
      btnBack.style.display = 'none';
    } else if (state === 'loading') {
      overlay.classList.add('active');
      title.style.display = 'block';
      title.textContent = 'Menjalankan Analisis AI';
      settingsToggle.style.display = 'none';
      settingsContent.classList.remove('active');
      inputGroup.style.display = 'none';
      loaderContainer.classList.add('active');
      loaderText.textContent = loadingText;
      analysisContainer.classList.remove('active');
      btnPrompt.style.display = 'none';
      btnReproduce.style.display = 'none';
      btnDownload.style.display = 'none';
      btnCancel.style.display = 'inline-block';
      btnCancel.textContent = 'Cancel';
      btnBack.style.display = 'none';
    } else if (state === 'results') {
      this.currentAnalysisMarkdown = rawMarkdown || '';
      overlay.classList.add('active');
      title.style.display = 'block';
      title.textContent = 'Analisis Masalah & Solusi';
      settingsToggle.style.display = 'none';
      settingsContent.classList.remove('active');
      inputGroup.style.display = 'none';
      loaderContainer.classList.remove('active');
      analysisContainer.classList.add('active');
      analysisContent.innerHTML = analysisHtml;
      btnPrompt.style.display = 'none';
      btnReproduce.style.display = 'none';
      btnDownload.style.display = 'inline-block';
      btnCancel.style.display = 'inline-block';
      btnCancel.textContent = 'Close';
      btnBack.style.display = 'inline-block';

      btnCancel.onclick = () => {
        this.close(null);
        if (this.resultsResolve) {
          this.resultsResolve('close');
          this.resultsResolve = null;
        }
      };

      btnBack.onclick = () => {
        if (this.resultsResolve) {
          this.resultsResolve('back');
          this.resultsResolve = null;
        }
      };

      btnDownload.onclick = () => {
        const blob = new Blob([this.currentAnalysisMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fixing_plan_${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
    }
  }

  public showWidget(text: string, onCancel: () => void) {
    const overlay = this.shadow.querySelector('.modal-overlay') as HTMLElement;
    const widget = this.shadow.querySelector('.status-widget') as HTMLElement;
    const widgetText = this.shadow.querySelector('.widget-text') as HTMLElement;
    const widgetCancel = this.shadow.querySelector('.status-widget .btn-cancel-sim') as HTMLButtonElement;

    overlay.classList.remove('active');
    widget.classList.add('active');
    widgetText.textContent = text;
    widgetCancel.onclick = onCancel;
  }

  public updateWidget(text: string) {
    const widgetText = this.shadow.querySelector('.widget-text') as HTMLElement;
    if (widgetText) {
      widgetText.textContent = text;
    }
  }

  public hideWidget() {
    const widget = this.shadow.querySelector('.status-widget') as HTMLElement;
    if (widget) {
      widget.classList.remove('active');
    }
  }

  public async prompt(initialValue = ''): Promise<{ action: 'prompt' | 'reproduce', value: string } | null> {
    const overlay = this.shadow.querySelector('.modal-overlay') as HTMLElement;
    const textarea = this.shadow.querySelector('textarea') as HTMLTextAreaElement;

    this.setViewState('input');
    textarea.value = initialValue;
    overlay.classList.add('active');
    setTimeout(() => textarea.focus(), 100);

    return new Promise((resolve) => {
      const btnPrompt = this.shadow.querySelector('.btn-confirm:not(.btn-reproduce)') as HTMLButtonElement;
      const btnReproduce = this.shadow.querySelector('.btn-reproduce') as HTMLButtonElement;
      const btnCancel = this.shadow.querySelector('.btn-cancel:not(.btn-back)') as HTMLButtonElement;

      const updateButtonStates = () => {
        const hasText = textarea.value.trim().length > 0;
        btnPrompt.disabled = !hasText;
        btnReproduce.disabled = !hasText;
      };

      updateButtonStates();
      textarea.oninput = () => {
        updateButtonStates();
      };

      btnPrompt.onclick = () => {
        if (!textarea.value.trim()) return;
        resolve({ action: 'prompt', value: textarea.value });
      };

      btnReproduce.onclick = () => {
        if (!textarea.value.trim()) return;
        const provider = localStorage.getItem('ai_debugger_provider') || 'gemini';
        const key = localStorage.getItem(`ai_debugger_${provider}_key`);
        const providerDisplay = provider === 'gemini' ? 'Gemini' : provider === 'minimax' ? 'MiniMax' : provider === 'openai' ? 'OpenAI' : 'Custom AI';
        if (!key) {
          alert(`Mohon masukkan API Key untuk ${providerDisplay} terlebih dahulu di menu Settings (⚙️).`);
          const settingsContent = this.shadow.querySelector('.settings-content') as HTMLElement;
          settingsContent.classList.add('active');
          return;
        }
        resolve({ action: 'reproduce', value: textarea.value });
      };

      btnCancel.onclick = () => {
        this.close(null);
        resolve(null);
      };
    });
  }

  public waitForResultsAction(): Promise<'back' | 'close'> {
    return new Promise((resolve) => {
      this.resultsResolve = resolve;
    });
  }

  private close(value: { action: 'prompt' | 'reproduce', value: string } | null) {
    const overlay = this.shadow.querySelector('.modal-overlay') as HTMLElement;
    overlay.classList.remove('active');

    if (this.resolvePromise) {
      this.resolvePromise(value);
      this.resolvePromise = null;
    }
  }
}

export class AIDebugger {
  private isActive: boolean = false;
  private overlay: HTMLElement;
  private selectedElement: HTMLElement | null = null;
  private customModal: AIDebuggerModal;
  private errorLogs: string[] = [];
  private readonly MAX_ERROR_LOGS = 3;

  constructor() {
    this.overlay = document.createElement('div');
    this.setupOverlayStyle();
    document.body.appendChild(this.overlay);

    this.customModal = new AIDebuggerModal();
    this.setupErrorInterceptors();

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    // Global shortcut: Ctrl/Cmd + Shift + D untuk toggle mode
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private setupErrorInterceptors() {
    // 1. Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      this.pushErrorLog(`[Console Error] ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`);
      originalConsoleError.apply(console, args);
    };

    // 2. Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.pushErrorLog(`[Fetch Error] ${response.status} ${response.statusText} for ${args[0]}`);
        }
        return response;
      } catch (error: any) {
        this.pushErrorLog(`[Fetch Network Error] ${error.message} for ${args[0]}`);
        throw error;
      }
    };

    // 3. Intercept XMLHttpRequest
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const self = this;
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
      this.addEventListener('load', function () {
        if (this.status >= 400) {
          self.pushErrorLog(`[XHR Error] ${this.status} ${this.statusText} for ${url}`);
        }
      });
      this.addEventListener('error', function () {
        self.pushErrorLog(`[XHR Network Error] for ${url}`);
      });
      return originalXhrOpen.apply(this, [method, url, ...rest] as any);
    };
  }

  private pushErrorLog(message: string) {
    this.errorLogs.push(`${new Date().toLocaleTimeString()} - ${message}`);
    if (this.errorLogs.length > this.MAX_ERROR_LOGS) {
      this.errorLogs.shift();
    }
  }

  private setupOverlayStyle() {

    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
      border: '2px solid #3b82f6',
      zIndex: '999999',
      transition: 'all 0.05s ease-out',
      display: 'none'
    });
  }

  private handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
      this.toggleInspectMode();
    }
  }

  public toggleInspectMode() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.overlay.style.display = 'block';
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('click', this.handleClick, { capture: true });
      console.log('🔍 AI Debugger Inspect Mode: ON');
    } else {
      this.overlay.style.display = 'none';
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('click', this.handleClick, { capture: true });
      console.log('🔍 AI Debugger Inspect Mode: OFF');
    }
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.isActive) return;
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    Object.assign(this.overlay.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  }

  private async handleClick(event: MouseEvent) {
    if (!this.isActive) return;
    event.preventDefault();
    event.stopPropagation();

    this.selectedElement = event.target as HTMLElement;
    this.toggleInspectMode();
    await this.promptUserExplanation(this.selectedElement);
  }

  private async promptUserExplanation(element: HTMLElement) {
    let keepLooping = true;
    let initialValue = '';

    while (keepLooping) {
      const result = await this.customModal.prompt(initialValue);
      if (!result) {
        keepLooping = false;
        break;
      }

      initialValue = result.value;

      if (result.value.trim()) {
        if (result.action === 'prompt') {
          this.generateAIPrompt(element, result.value);
          keepLooping = false;
        } else if (result.action === 'reproduce') {
          await this.autoReproduce(result.value, element);

          const action = await this.customModal.waitForResultsAction();
          if (action === 'back') {
            this.customModal.setViewState('input');
          } else {
            keepLooping = false;
          }
        }
      } else {
        keepLooping = false;
      }
    }
  }

  private async callAIAPI(prompt: string, systemInstruction?: string): Promise<string> {
    const provider = localStorage.getItem('ai_debugger_provider') || 'gemini';
    const apiKey = localStorage.getItem(`ai_debugger_${provider}_key`) || '';
    if (!apiKey) {
      throw new Error(`API Key untuk ${provider} tidak ditemukan.`);
    }

    if (provider === 'gemini') {
      const model = localStorage.getItem('ai_debugger_gemini_model') || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestBody: any = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      };

      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [
            { text: systemInstruction }
          ]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      return json.candidates[0].content.parts[0].text;
    } else {
      let baseUrl = '';
      let defaultModel = '';
      if (provider === 'minimax') {
        baseUrl = localStorage.getItem('ai_debugger_minimax_url') || 'https://api.minimax.io/v1';
        defaultModel = 'MiniMax-M2.5';
      } else if (provider === 'openai') {
        baseUrl = localStorage.getItem('ai_debugger_openai_url') || 'https://api.openai.com/v1';
        defaultModel = 'gpt-4o-mini';
      } else {
        baseUrl = localStorage.getItem('ai_debugger_custom_url') || '';
        defaultModel = 'custom-model';
      }

      if (!baseUrl) {
        throw new Error(`Base URL untuk ${provider} tidak boleh kosong.`);
      }

      const model = localStorage.getItem(`ai_debugger_${provider}_model`) || defaultModel;
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const url = `${cleanBaseUrl}/chat/completions`;

      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const requestBody: any = {
        model,
        messages
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider.toUpperCase()} API Error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      if (!json.choices || json.choices.length === 0 || !json.choices[0].message) {
        throw new Error(`Invalid response structure from ${provider.toUpperCase()} API.`);
      }
      return json.choices[0].message.content;
    }
  }

  private getInteractiveElements(): { selector: string; tagName: string; text: string; id: string; classes: string }[] {
    const list: any[] = [];
    const elements = document.querySelectorAll('button, input, select, textarea, a, [role="button"], .mat-mdc-button-base');

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(htmlEl).display === 'none') {
        return;
      }

      let selector = htmlEl.tagName.toLowerCase();
      if (htmlEl.id) {
        selector += `#${htmlEl.id}`;
      } else {
        const classes = Array.from(htmlEl.classList)
          .filter(cls => !cls.startsWith('ng-') && !cls.includes('mat-') && !cls.includes('cdk-'));
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
        if (htmlEl.getAttribute('name')) {
          selector += `[name="${htmlEl.getAttribute('name')}"]`;
        }
        if (htmlEl.getAttribute('placeholder')) {
          selector += `[placeholder="${htmlEl.getAttribute('placeholder')}"]`;
        }
      }

      list.push({
        selector,
        tagName: htmlEl.tagName.toLowerCase(),
        text: (htmlEl.textContent || htmlEl.getAttribute('placeholder') || '').trim().substring(0, 50),
        id: htmlEl.id,
        classes: htmlEl.className
      });
    });

    return list;
  }

  private highlightSimulatedElement(element: HTMLElement, color = '#10b981') {
    const rect = element.getBoundingClientRect();
    Object.assign(this.overlay.style, {
      display: 'block',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: `2px solid ${color}`,
      backgroundColor: `${color}4D`
    });
  }

  private async executeAction(action: any): Promise<void> {
    const selector = action.selector;
    let element = document.querySelector(selector) as HTMLElement;

    if (!element) {
      const tag = selector.split(/[#.]/)[0];
      if (tag) {
        const candidates = document.querySelectorAll(tag);
        for (const candidate of Array.from(candidates)) {
          const textContent = candidate.textContent || '';
          if (action.text && textContent.includes(action.text)) {
            element = candidate as HTMLElement;
            break;
          }
        }
      }
    }

    if (!element) {
      throw new Error(`Elemen tidak ditemukan untuk selector: ${selector}`);
    }

    this.highlightSimulatedElement(element, '#10b981');
    await new Promise(resolve => setTimeout(resolve, 400));

    if (action.action === 'click') {
      element.focus();
      element.click();

      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    } else if (action.action === 'type') {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
      inputEl.focus();
      inputEl.value = action.text || '';

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    } else if (action.action === 'wait') {
      await new Promise(resolve => setTimeout(resolve, action.duration || 500));
    }

    this.overlay.style.display = 'none';
  }

  private parseActionJSON(jsonStr: string): any[] {
    let cleaned = jsonStr.trim();

    // 1. Strip think blocks (e.g. from DeepSeek, MiniMax, etc.)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Strip markdown code blocks
    if (cleaned.includes('```')) {
      const match = cleaned.match(/```(?:json)?([\s\S]*?)```/i);
      if (match && match[1]) {
        cleaned = match[1].trim();
      } else {
        cleaned = cleaned.replace(/```[a-zA-Z]*/g, '').replace(/```/g, '').trim();
      }
    }

    // 3. Extract JSON array if there's surrounding text
    const startIndex = cleaned.indexOf('[');
    const endIndex = cleaned.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    return JSON.parse(cleaned.trim());
  }

  private parseMarkdown(md: string): string {
    const cleanMd = md.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return cleanMd
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*\*\s+(.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^\s*-\s+(.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n/g, '<br>');
  }

  private async autoReproduce(userExplanation: string, selectedElement: HTMLElement) {
    const provider = localStorage.getItem('ai_debugger_provider') || 'gemini';
    const apiKey = localStorage.getItem(`ai_debugger_${provider}_key`) || '';
    const providerDisplay = provider === 'gemini' ? 'Gemini' : provider === 'minimax' ? 'MiniMax' : provider === 'openai' ? 'OpenAI' : 'Custom AI';
    if (!apiKey) {
      alert(`Kunci API ${providerDisplay} tidak ditemukan.`);
      return;
    }

    let isCancelled = false;
    const cancelSimulation = () => {
      isCancelled = true;
      this.customModal.hideWidget();
      this.customModal.setViewState('input');
    };

    try {
      this.customModal.showWidget(`🤖 AI: Menghubungkan ke ${providerDisplay}...`, cancelSimulation);

      const interactiveElements = this.getInteractiveElements();
      const elementsJson = JSON.stringify(interactiveElements, null, 2);

      const planPrompt = `Saya ingin mereproduksi masalah frontend berikut: "${userExplanation}".
      
Berikut adalah daftar elemen interaktif yang saat ini terlihat di halaman:
${elementsJson}

Tolong tentukan langkah-langkah simulasi untuk mereproduksi masalah tersebut menggunakan elemen di atas. 
Kembalikan respon hanya dalam bentuk array JSON berisi objek aksi.
Tiap objek harus berupa salah satu dari format berikut:
- {"action": "click", "selector": "selector-elemen"}
- {"action": "type", "selector": "selector-elemen", "text": "teks yang diinput"}
- {"action": "wait", "duration": durasi-dalam-milidetik}

Contoh keluaran:
[
  { "action": "click", "selector": "button.btn-primary" },
  { "action": "wait", "duration": 500 }
]

Jawab HANYA dengan array JSON tersebut. Jangan berikan teks lain atau tanda kutip markdown (\`\`\`json).`;

      const planResponse = await this.callAIAPI(planPrompt, "You are a web automation planning assistant. Return only valid JSON array of actions.");
      if (isCancelled) return;

      let actions: any[] = [];
      try {
        actions = this.parseActionJSON(planResponse);
      } catch (e) {
        console.error('Failed to parse actions JSON:', planResponse, e);
        alert(`Gagal menjabarkan langkah reproduksi dari ${providerDisplay}. Harap jelaskan dengan lebih spesifik.`);
        this.customModal.hideWidget();
        this.customModal.setViewState('input');
        return;
      }

      if (!Array.isArray(actions) || actions.length === 0) {
        alert('Tidak ada langkah reproduksi yang dihasilkan.');
        this.customModal.hideWidget();
        this.customModal.setViewState('input');
        return;
      }

      this.errorLogs = [];

      for (let i = 0; i < actions.length; i++) {
        if (isCancelled) return;
        const act = actions[i];

        let stepText = `🤖 AI: Langkah ${i + 1}/${actions.length}: `;
        if (act.action === 'click') {
          stepText += `Klik ${act.selector}`;
        } else if (act.action === 'type') {
          stepText += `Ketik "${act.text}" di ${act.selector}`;
        } else if (act.action === 'wait') {
          stepText += `Tunggu ${act.duration}ms`;
        }

        this.customModal.updateWidget(stepText);

        try {
          await this.executeAction(act);
        } catch (err: any) {
          console.warn(`Gagal menjalankan aksi ke-${i + 1}:`, err.message);
        }

        await new Promise(resolve => setTimeout(resolve, 800));
      }

      if (isCancelled) return;

      this.customModal.hideWidget();
      this.customModal.setViewState('loading', 'Menganalisis hasil simulasi & mencari solusi...');

      const cleanElementHTML = selectedElement ? this.cleanHTML(selectedElement) : '';
      const breadcrumbs = selectedElement ? this.getBreadcrumbs(selectedElement) : '';

      let frameworkContext = '';
      const isAngular = !!(window as any).ng;
      const hasReactFiber = Object.keys(selectedElement).some(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));

      if (isAngular) {
        frameworkContext = this.getAngularContext(selectedElement);
      } else if (hasReactFiber) {
        frameworkContext = this.getReactContext(selectedElement);
      }

      const logs = this.errorLogs.join('\n');

      const analysisPrompt = `Saya baru saja mensimulasikan langkah-langkah berikut untuk mereproduksi masalah:
${JSON.stringify(actions, null, 2)}

Hasil Log Error selama simulasi berjalan:
${logs || 'Tidak ada error log yang tercatat di console.'}

Penjelasan masalah awal oleh pengguna:
"${userExplanation}"

Konteks target elemen terakhir yang dipilih:
Hirarki (Breadcrumbs): ${breadcrumbs}
HTML:
\`\`\`html
${cleanElementHTML}
\`\`\`
${frameworkContext}

Tolong berikan rekomendasi perbaikan (Fixing Plan) yang SEDERHANA dan MUDAH dipahami oleh developer junior atau AI model lainnya:
1. **Penyebab Masalah (Root Cause)**: Jelaskan secara singkat dan to-the-point apa yang salah.
2. **Pengecekan Kode Existing**: Instruksikan developer junior untuk melakukan pengecekan kode existing terlebih dahulu (misal: cek file mana, verifikasi inisialisasi variabel, periksa import, atau struktur state saat ini) sebelum mengubah apa pun.
3. **Langkah Perbaikan (Langkah demi Langkah)**: Berikan panduan perbaikan yang sederhana, jelas, berurutan setelah pengecekan dilakukan, dan hindari solusi yang terlalu kompleks atau over-engineered.
4. **Kode Solusi**: Berikan potongan kode perbaikan (TypeScript/HTML/CSS) yang bersih, siap pakai, dan sebutkan dengan jelas di file mana serta bagian mana kode tersebut harus diletakkan.
 
Format jawaban Anda dalam Bahasa Indonesia dengan format markdown yang terstruktur dengan baik.`;

      const analysisResponse = await this.callAIAPI(analysisPrompt, "You are an expert frontend debugging assistant. Analyze the logs and provide a detailed explanation and code solution.");
      if (isCancelled) return;

      const analysisHtml = this.parseMarkdown(analysisResponse);
      this.customModal.setViewState('results', '', analysisHtml, analysisResponse);

    } catch (err: any) {
      console.error(err);
      alert(`Terjadi kesalahan selama proses otomatisasi: ${err.message}`);
      this.customModal.hideWidget();
      this.customModal.setViewState('input');
    }
  }

  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    };
  }

  private getAngularContext(element: HTMLElement): string {
    try {
      const win = window as any;
      if (win.ng && win.ng.getComponent) {
        const componentInstance = win.ng.getComponent(element) || win.ng.getContext(element);
        if (componentInstance) {
          const componentName = componentInstance.constructor.name;

          // ==========================================
          // FILTER LOGIC UNTUK MENCEGAH PROMPT PANJANG
          // ==========================================
          const cleanState: any = {};

          for (const key in componentInstance) {
            // 1. Abaikan properti internal Angular (biasanya berawalan _)
            if (key.startsWith('_')) continue;

            // 2. Abaikan Service, UseCase, Repository, dan Router (karena isinya statis & panjang)
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('service') || lowerKey.includes('usecase') ||
              lowerKey.includes('repository') || lowerKey === 'router' || lowerKey === 'apollo') {
              continue;
            }

            const value = componentInstance[key];

            // 3. Abaikan objek RxJS (Subject, Subscription, Observable)
            // Ciri-cirinya biasanya memiliki properti 'closed', 'observers', atau 'isStopped'
            if (value && typeof value === 'object' && ('closed' in value || 'observers' in value || 'isStopped' in value)) {
              continue;
            }

            // Jika lolos filter, masukkan ke state yang bersih
            cleanState[key] = value;
          }

          // Gunakan getCircularReplacer dan batasi kedalaman objek menjadi lebih dangkal
          const stateProps = JSON.stringify(cleanState, this.getCircularReplacer(), 2);

          return `Angular Component: ${componentName}\nClean State:\n${stateProps}`;
        }
      }
    } catch (e) {
      console.warn("Gagal mengambil Angular context");
    }
    return "Konteks Angular tidak ditemukan.";
  }

  private getReactContext(element: HTMLElement): string {
    try {
      // React 17+ internal properties
      const key = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (!key) return '';

      const fiber = (element as any)[key];
      let componentName = 'Unknown';
      let props = {};

      // Traverse up to find the component name and props
      let current = fiber;
      while (current) {
        if (typeof current.type === 'function') {
          componentName = current.type.displayName || current.type.name || 'Anonymous';
          props = current.memoizedProps;
          break;
        } else if (typeof current.type === 'string') {
          // It's a host component (div, span, etc.), keep looking up
          props = current.memoizedProps;
        }
        current = current.return;
      }

      const propsString = JSON.stringify(props, this.getCircularReplacer(), 2);
      return `\n\nReact Component: ${componentName}\nProps: \n${propsString}`;
    } catch (e) {
      return '\n\nReact Context: Error extracting props';
    }
  }

  private cleanHTML(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;

    const cleanNode = (node: HTMLElement) => {
      // Clean attributes
      const attrs = Array.from(node.attributes);
      for (const attr of attrs) {
        if (
          attr.name.startsWith('_ngcontent') ||
          attr.name.startsWith('_nghost') ||
          attr.name.startsWith('ng-reflect-') ||
          attr.name === 'ng-version'
        ) {
          node.removeAttribute(attr.name);
        }
      }

      // Clean class lists
      const noisyClasses = [
        'mat-focus-indicator',
        'mat-ripple',
        'mat-button-ripple',
        'cdk-focused',
        'cdk-program-focused',
        'cdk-mouse-focused',
        'cdk-keyboard-focused'
      ];
      for (const cls of noisyClasses) {
        node.classList.remove(cls);
      }

      // If class attribute is empty, remove it
      if (node.getAttribute('class') === '') {
        node.removeAttribute('class');
      }

      // Traverse children
      const children = Array.from(node.children);
      for (const child of children) {
        cleanNode(child as HTMLElement);
      }
    };

    cleanNode(clone);
    return clone.outerHTML;
  }

  private getBreadcrumbs(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    let depth = 0;
    const maxDepth = 6;

    while (current && current !== document.body && depth < maxDepth) {
      let part = current.tagName.toLowerCase();

      if (current.id) {
        part += `#${current.id}`;
      } else {
        const noisyClasses = [
          'mat-focus-indicator',
          'mat-ripple',
          'mat-button-ripple',
          'cdk-focused',
          'cdk-program-focused',
          'cdk-mouse-focused',
          'cdk-keyboard-focused'
        ];
        const classes = Array.from(current.classList)
          .filter(cls => !noisyClasses.includes(cls) && !cls.startsWith('ng-'));
        if (classes.length > 0) {
          part += `.${classes.join('.')}`;
        }
      }

      parts.unshift(part);
      current = current.parentElement;
      depth++;
    }

    if (current === document.body) {
      parts.unshift('body');
    } else if (current) {
      parts.unshift('...');
    }

    return parts.join(' > ');
  }

  private async generateAIPrompt(element: HTMLElement, userExplanation: string) {
    const cleanElementHTML = this.cleanHTML(element);
    const breadcrumbs = this.getBreadcrumbs(element);

    // Framework Awareness Detection
    let frameworkContext = '';
    const isAngular = !!(window as any).ng;
    const hasReactFiber = Object.keys(element).some(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));

    if (isAngular) {
      frameworkContext = this.getAngularContext(element);
    } else if (hasReactFiber) {
      frameworkContext = this.getReactContext(element);
    }

    const errorLogsText = this.errorLogs.length > 0
      ? `\n\nRecent Errors (Last ${this.errorLogs.length}):\n${this.errorLogs.join('\n')}`
      : '';

    const promptText = `Konteks: Saya sedang melakukan debugging aplikasi Frontend. Terdapat bug pada komponen berikut.
    
Penjelasan Bug: "${userExplanation}"

Hirarki Elemen (Breadcrumbs):
\`${breadcrumbs}\`

Target Elemen HTML:
\`\`\`html
${cleanElementHTML}
\`\`\`${frameworkContext}${errorLogsText}

Tolong analisis kemungkinan penyebab bug ini pada sisi framework dan berikan langkah perbaikannya.`;

    try {
      await navigator.clipboard.writeText(promptText);
      // eslint-disable-next-line no-console
      console.log('✅ Prompt berhasil disalin ke clipboard!');
      alert('Prompt telah disalin ke clipboard! Silakan tempel di Gemini CLI.');
    } catch (err) {
      console.error('Gagal menyalin ke clipboard:', err);
    }
  }
}

// Init
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debuggerInstance = new AIDebugger();
}
