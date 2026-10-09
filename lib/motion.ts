/** Rail pill, toggle groups, every sliding indicator: slides and settles with a hint of overshoot. */
export const SPRING_DETENT = { type: "spring", stiffness: 345, damping: 30 } as const;

/** Small things that pop in: badges, menus. */
export const SPRING_POP = { type: "spring", stiffness: 420, damping: 34, mass: 0.6 } as const;

/** Mirrors --ease-instrument in globals.css. */
export const EASE_INSTRUMENT = [0.22, 1, 0.36, 1] as const;
