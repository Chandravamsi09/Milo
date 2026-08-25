import { World } from '../src/engine/ecs/World';
import { Entity } from '../src/engine/ecs/Entity';

export function testECSWorld(): boolean {
  console.log("Running Test Suite 2: ECS World & Query Engine...");
  const world = new World();
  const entity = new Entity();

  if (!world.getId() || !entity.getId()) throw new Error("ECS initialization failed");
  const diagnostics = world.dumpDiagnostics();
  if (diagnostics.enabled !== true) throw new Error("World is disabled");

  console.log("✓ Test Suite 2 Passed: ECS Entity Component System operational.");
  return true;
}
