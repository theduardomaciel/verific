/** FLIP animation for sortable lists. Skips reduced-motion users. */
function flipAnimate(
	container: HTMLElement | null,
	selector: string,
	attr: string,
) {
	if (!container || typeof window === "undefined") return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const first = new Map<string, number>();
	container.querySelectorAll<HTMLElement>(selector).forEach((el) => {
		const id = el.dataset[attr];
		if (id) first.set(id, el.getBoundingClientRect().top);
	});
	if (first.size === 0) return;
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			container.querySelectorAll<HTMLElement>(selector).forEach((el) => {
				const id = el.dataset[attr];
				if (!id) return;
				const prevTop = first.get(id);
				if (prevTop === undefined) return;
				const nextTop = el.getBoundingClientRect().top;
				const dy = prevTop - nextTop;
				if (dy !== 0) {
					el.animate(
						[
							{ transform: `translateY(${dy}px)` },
							{ transform: "translateY(0)" },
						],
						{
							duration: 250,
							easing: "cubic-bezier(0.25, 1, 0.5, 1)",
						},
					);
				}
			});
		});
	});
}

/** FLIP animation for the sortable field list. Skips reduced-motion users. */
export function animateFlip(container: HTMLElement | null) {
	flipAnimate(container, "[data-field-id]", "fieldId");
}

/** FLIP animation for the sortable section list. Skips reduced-motion users. */
export function animateSectionFlip(container: HTMLElement | null) {
	flipAnimate(container, "[data-section-id]", "sectionId");
}
