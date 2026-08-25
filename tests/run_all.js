import { testEngineLoop } from './EngineLoop.test.ts';
import { testECSWorld } from './ECSWorld.test.ts';
import { testPhysicsCollision } from './PhysicsCollision.test.ts';
import { testSaveLoadSystem } from './SaveLoadSystem.test.ts';
import { testInventoryCrafting } from './InventoryCrafting.test.ts';
import { testQuestEngine } from './QuestEngine.test.ts';

console.log("==========================================");
console.log("   MILO GAME ENGINE TEST RUNNER v1.0      ");
console.log("==========================================");

try {
  testEngineLoop();
  testECSWorld();
  testPhysicsCollision();
  testSaveLoadSystem();
  testInventoryCrafting();
  testQuestEngine();
  console.log("
ALL 6 TEST SUITES PASSED CLEANLY! (100% PASS RATE)");
} catch (err) {
  console.error("Test failure:", err);
  process.exit(1);
}
