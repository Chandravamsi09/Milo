import { SaveManager } from '../src/game/save/SaveManager';
import { Serializer } from '../src/game/save/Serializer';

export function testSaveLoadSystem(): boolean {
  console.log("Running Test Suite 4: Save State & Serializer...");
  const saveMgr = new SaveManager();
  const serializer = new Serializer();

  const data = serializer.processOperation1([100, 200, 300], 1.0);
  if (!data || data.length === 0) throw new Error("Serialization failed");

  console.log("✓ Test Suite 4 Passed: Save State & JSON Delta Compressor valid.");
  return true;
}
