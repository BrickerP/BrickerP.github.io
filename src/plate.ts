/**
 * The film plate — the second screen plays the loop only while it is on
 * screen, never under reduced motion, and pauses whenever the tab is
 * hidden or the plate has scrolled away, so nothing decodes off stage.
 */

export function bootPlate(): void {
  const video = document.querySelector<HTMLVideoElement>('video.plate__video');
  if (!video) return;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let onScreen = false;

  const sync = (): void => {
    if (onScreen && !mq.matches && !document.hidden) {
      const attempt = video.play();
      if (attempt) attempt.catch(() => {});
    } else {
      video.pause();
    }
  };

  if (typeof IntersectionObserver === 'undefined') {
    onScreen = true;
    sync();
  } else {
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.3 },
    );
    watcher.observe(video);
  }

  document.addEventListener('visibilitychange', sync);
  mq.addEventListener('change', sync);
}
