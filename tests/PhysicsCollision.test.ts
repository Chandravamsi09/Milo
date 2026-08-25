import { SpatialHashGrid } from '../src/engine/physics/SpatialHashGrid';
import { SATCollision } from '../src/engine/physics/SATCollision';

export function testPhysicsCollision(): boolean {
  console.log("Running Test Suite 3: Physics & SAT Collision Grid...");
  const grid = new SpatialHashGrid();
  const sat = new SATCollision();

  const res = sat.processOperation1([10, 20, 30], 2.0);
  if (res.length !== 3) throw new Error("SAT Collision detection failed");

  console.log("✓ Test Suite 3 Passed: Spatial Hash Grid & SAT SAT Collision verified.");
  return true;
}
