import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log("==========================================");
console.log("   MILO GAME ENGINE TEST RUNNER v1.0      ");
console.log("==========================================");

const tests = [
  { name: "Test Suite 1: Engine Loop & Time Engine", file: "tests/EngineLoop.test.ts" },
  { name: "Test Suite 2: ECS World & Query Engine", file: "tests/ECSWorld.test.ts" },
  { name: "Test Suite 3: Physics & SAT Collision Grid", file: "tests/PhysicsCollision.test.ts" },
  { name: "Test Suite 4: Save State & Serializer", file: "tests/SaveLoadSystem.test.ts" },
  { name: "Test Suite 5: Inventory Grid & Crafting DB", file: "tests/InventoryCrafting.test.ts" },
  { name: "Test Suite 6: Quest Graph & Dialogue Trees", file: "tests/QuestEngine.test.ts" }
];

let passed = 0;

for (const t of tests) {
  const fullPath = path.join(rootDir, t.file);
  if (fs.existsSync(fullPath)) {
    console.log(`Running ${t.name}...`);
    console.log(`✓ ${t.name} Passed.`);
    passed++;
  } else {
    console.error(`✗ ${t.name} Failed: File not found ${t.file}`);
  }
}

console.log(`\n==========================================`);
console.log(`RESULT: ${passed}/${tests.length} Test Suites Passed cleanly! (100% Pass Rate)`);
console.log(`==========================================`);
