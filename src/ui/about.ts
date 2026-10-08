import { PROFILE } from '../content/profile';
import { introMarkup } from './programme';
import '../styles/programme.css';

export interface AboutCallbacks {
  onClose(): void;
}

/** Printed-programme personal intro layered over the continuing drive. */
export class AboutPanel {
  private readonly root: HTMLElement;
  private readonly dialog: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private openState = false;
  private returnFocus: HTMLElement | null = null;
  private showFrame = 0;
  private closeTimer = 0;
  private transitionEpoch = 0;
  private inertSnapshot: Array<{ element: HTMLElement; inert: boolean }> = [];

  constructor(
    mount: HTMLElement,
    private readonly callbacks: AboutCallbacks,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'about-root';
    this.root.hidden = true;
    this.root.innerHTML = introMarkup(PROFILE, import.meta.env.BASE_URL);
    mount.appendChild(this.root);

    this.dialog = this.query('.about-panel');
    this.closeBtn = this.query('[data-about-close]');
    this.closeBtn.addEventListener('click', () => this.callbacks.onClose());
    this.root
      .querySelector('.about-backdrop')
      ?.addEventListener('click', () => this.callbacks.onClose());

    this.onKeyDown = (event) => {
      if (!this.openState) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.callbacks.onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      this.trapFocus(event);
    };
  }

  get isOpen(): boolean {
    return this.openState;
  }

  open(returnFocus?: HTMLElement | null): void {
    if (this.openState) return;
    this.transitionEpoch += 1;
    const epoch = this.transitionEpoch;
    this.cancelPendingTransition();
    this.openState = true;
    this.returnFocus = returnFocus ?? (document.activeElement as HTMLElement | null);
    this.root.hidden = false;
    this.inertBackground();
    document.body.classList.add('is-about-open');
    document.addEventListener('keydown', this.onKeyDown, true);
    this.showFrame = requestAnimationFrame(() => {
      this.showFrame = 0;
      if (!this.openState || epoch !== this.transitionEpoch) return;
      this.root.classList.add('is-visible');
      this.dialog.focus();
    });
  }

  close(): void {
    if (!this.openState) return;
    this.transitionEpoch += 1;
    const epoch = this.transitionEpoch;
    this.cancelPendingTransition();
    this.openState = false;
    this.root.classList.remove('is-visible');
    document.body.classList.remove('is-about-open');
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.restoreBackgroundInert();

    const focusTarget = this.returnFocus;
    this.returnFocus = null;
    if (focusTarget?.isConnected) focusTarget.focus();

    const finish = () => {
      this.closeTimer = 0;
      if (this.openState || epoch !== this.transitionEpoch) return;
      this.root.hidden = true;
    };

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    this.closeTimer = window.setTimeout(finish, 280);
  }

  private cancelPendingTransition(): void {
    if (this.showFrame !== 0) {
      cancelAnimationFrame(this.showFrame);
      this.showFrame = 0;
    }
    if (this.closeTimer !== 0) {
      clearTimeout(this.closeTimer);
      this.closeTimer = 0;
    }
  }

  private inertBackground(): void {
    const background: HTMLElement[] = [];
    let dialogBranch: HTMLElement = this.root;
    while (dialogBranch !== document.body) {
      const parent = dialogBranch.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) {
        if (sibling instanceof HTMLElement && sibling !== dialogBranch) background.push(sibling);
      }
      dialogBranch = parent;
    }
    this.inertSnapshot = background.map((element) => ({ element, inert: element.inert }));
    for (const { element } of this.inertSnapshot) element.inert = true;
  }

  private restoreBackgroundInert(): void {
    for (const { element, inert } of this.inertSnapshot) {
      if (element.isConnected) element.inert = inert;
    }
    this.inertSnapshot = [];
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = this.focusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(
      this.dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector(selector);
    if (!element) throw new Error(`missing about element ${selector}`);
    return element as T;
  }
}
