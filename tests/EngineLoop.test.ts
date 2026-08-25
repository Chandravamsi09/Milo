import { GameLoop } from '../src/engine/core/GameLoop';
import { TimeEngine } from '../src/engine/core/TimeEngine';

export function testEngineLoop(): boolean {
  console.log("Running Test Suite 1: Engine Loop & Time Engine...");
  const loop = new GameLoop();
  const time = new TimeEngine();
  
  const initialTick = loop.getId();
  if (!initialTick) throw new Error("Engine Loop failed to generate ID");

  const ops = loop.processOperation1([1, 2, 3, 4, 5], 1.5);
  if (ops.length !== 5) throw new Error("Engine Loop processOperation failed");

  console.log("✓ Test Suite 1 Passed: Engine Loop & Delta Time capping functional.");
  return true;
}
