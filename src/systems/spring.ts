/** Critically-damped spring toward a moving target (gameplay pseudo-physics). */

export interface SpringState {
  value: number;
  velocity: number;
}

export function springStep(
  state: SpringState,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): void {
  const force = (target - state.value) * stiffness;
  state.velocity += force * dt;
  state.velocity *= Math.exp(-damping * dt);
  state.value += state.velocity * dt;
}

export function springVecY(
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): { value: number; velocity: number } {
  const s: SpringState = { value, velocity };
  springStep(s, target, stiffness, damping, dt);
  return s;
}
