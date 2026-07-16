import { PROFILE, type ExperienceRole } from '../content/profile';

export interface AboutCallbacks {
  onClose(): void;
}

/** Glass personal-intro panel layered over the continuing drive. */
export class AboutPanel {
  private readonly root: HTMLElement;
  private readonly dialog: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private openState = false;
  private returnFocus: HTMLElement | null = null;
  private readonly expanded = new Set<string>();

  constructor(
    mount: HTMLElement,
    private readonly callbacks: AboutCallbacks,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'about-root';
    this.root.hidden = true;
    this.root.innerHTML = this.template();
    mount.appendChild(this.root);

    this.dialog = this.query('.about-panel');
    this.closeBtn = this.query('[data-about-close]');
    this.closeBtn.addEventListener('click', () => this.callbacks.onClose());
    this.root
      .querySelector('.about-backdrop')
      ?.addEventListener('click', () => this.callbacks.onClose());

    this.root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const toggle = target.closest<HTMLButtonElement>('[data-expand]');
      if (!toggle) return;
      const id = toggle.dataset.expand;
      if (!id) return;
      this.toggleExpand(id, toggle);
    });

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
    this.openState = true;
    this.returnFocus = returnFocus ?? (document.activeElement as HTMLElement | null);
    this.root.hidden = false;
    document.body.classList.add('is-about-open');
    document.addEventListener('keydown', this.onKeyDown, true);
    requestAnimationFrame(() => {
      this.root.classList.add('is-visible');
      this.dialog.focus();
    });
  }

  close(): void {
    if (!this.openState) return;
    this.openState = false;
    this.root.classList.remove('is-visible');
    document.body.classList.remove('is-about-open');
    document.removeEventListener('keydown', this.onKeyDown, true);

    const focusTarget = this.returnFocus;
    this.returnFocus = null;
    focusTarget?.focus?.();

    const finish = () => {
      if (this.openState) return;
      this.root.hidden = true;
    };

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    window.setTimeout(finish, 280);
  }

  private toggleExpand(id: string, button: HTMLButtonElement): void {
    const role = PROFILE.experience.find((item) => item.id === id);
    if (!role || role.details.length === 0) return;

    const list = this.root.querySelector<HTMLElement>(`[data-detail-list="${id}"]`);
    if (!list) return;

    const willExpand = !this.expanded.has(id);
    if (willExpand) {
      this.expanded.add(id);
      list.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      button.textContent = 'Show less';
    } else {
      this.expanded.delete(id);
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.textContent = 'Show more';
    }
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
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
  }

  private template(): string {
    const proof = PROFILE.publicProof
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');
    const experience = PROFILE.experience.map((role) => this.roleMarkup(role)).join('');
    const education = PROFILE.education
      .map(
        (item) => `
          <li>
            <p class="about-edu-school">${escapeHtml(item.school)}</p>
            <p class="about-edu-detail">${escapeHtml(item.detail)}</p>
          </li>`,
      )
      .join('');
    const elsewhere = PROFILE.elsewhere
      .map(
        (link) => `
          <li>
            <a href="${escapeAttr(link.href)}" ${externalAttrs(link.href)}>
              <span class="about-link-label">${escapeHtml(link.label)}</span>
              ${link.detail ? `<span class="about-link-detail">${escapeHtml(link.detail)}</span>` : ''}
            </a>
          </li>`,
      )
      .join('');

    return `
      <div class="about-backdrop" data-about-backdrop tabindex="-1" aria-hidden="true"></div>
      <section
        class="about-panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-labelledby="about-name"
        aria-describedby="about-summary"
      >
        <header class="about-header">
          <div class="about-identity">
            <p class="about-eyebrow">PERSONAL INTRO</p>
            <h2 class="about-name" id="about-name">${escapeHtml(PROFILE.name)}</h2>
            <p class="about-role">${escapeHtml(PROFILE.role)}</p>
            <p class="about-status">${escapeHtml(PROFILE.status)}</p>
          </div>
          <button
            class="ui-btn ui-icon-btn about-close"
            type="button"
            data-about-close
            aria-label="Close personal intro"
            title="Close personal intro (Esc)"
          >${ICON.close}</button>
        </header>

        <div class="about-scroll">
          <p class="about-summary" id="about-summary">${escapeHtml(PROFILE.summary)}</p>

          <section class="about-section" aria-labelledby="about-proof-title">
            <h3 class="about-section-title" id="about-proof-title">Public proof</h3>
            <ul class="about-list">${proof}</ul>
          </section>

          <section class="about-section" aria-labelledby="about-experience-title">
            <h3 class="about-section-title" id="about-experience-title">Experience</h3>
            <div class="about-experience">${experience}</div>
          </section>

          <section class="about-section" aria-labelledby="about-education-title">
            <h3 class="about-section-title" id="about-education-title">Education</h3>
            <ul class="about-education">${education}</ul>
          </section>

          <section class="about-section" aria-labelledby="about-focus-title">
            <h3 class="about-section-title" id="about-focus-title">Focus</h3>
            <p class="about-focus">${escapeHtml(PROFILE.focus)}</p>
          </section>

          <section class="about-section" aria-labelledby="about-elsewhere-title">
            <h3 class="about-section-title" id="about-elsewhere-title">Elsewhere</h3>
            <ul class="about-elsewhere">${elsewhere}</ul>
          </section>
        </div>
      </section>
    `;
  }

  private roleMarkup(role: ExperienceRole): string {
    const summary = role.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const details = role.details.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const expander =
      role.details.length > 0
        ? `<button
            class="about-expand"
            type="button"
            data-expand="${escapeAttr(role.id)}"
            aria-expanded="false"
            aria-controls="about-details-${escapeAttr(role.id)}"
          >Show more</button>`
        : '';

    return `
      <article class="about-role-block" data-role="${escapeAttr(role.id)}">
        <h4 class="about-role-title">${escapeHtml(role.title)}</h4>
        <p class="about-role-org">${escapeHtml(role.org)}</p>
        <p class="about-role-meta">${escapeHtml(role.meta)}</p>
        <ul class="about-list">${summary}</ul>
        <ul
          class="about-list about-details"
          id="about-details-${escapeAttr(role.id)}"
          data-detail-list="${escapeAttr(role.id)}"
          hidden
        >${details}</ul>
        ${expander}
      </article>
    `;
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector(selector);
    if (!element) throw new Error(`missing about element ${selector}`);
    return element as T;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function externalAttrs(href: string): string {
  if (href.startsWith('mailto:') || href.startsWith('/')) return '';
  return 'target="_blank" rel="noopener noreferrer"';
}

const ICON = {
  close:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
} as const;
