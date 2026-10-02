/** FLIP animation for the sortable field list. Skips reduced-motion users. */
export function animateFlip(container: HTMLElement | null) {
	if (!container || typeof window === "undefined") return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const first = new Map<string, number>();
	container
		.querySelectorAll<HTMLElement>("[data-field-id]")
		.forEach((el) => {
			const id = el.dataset.fieldId;
			if (id) first.set(id, el.getBoundingClientRect().top);
		});
	if (first.size === 0) return;
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			container
				.querySelectorAll<HTMLElement>("[data-field-id]")
				.forEach((el) => {
					const id = el.dataset.fieldId;
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
