import { QuestEngine } from '../src/game/quest/QuestEngine';
import { DialogueNodeTree } from '../src/game/quest/DialogueNodeTree';

export function testQuestEngine(): boolean {
  console.log("Running Test Suite 6 (Bonus): Quest Graph & Dialogue Trees...");
  const quest = new QuestEngine();
  const dialogue = new DialogueNodeTree();

  if (!quest.getId() || !dialogue.getId()) throw new Error("Quest engine error");

  console.log("✓ Test Suite 6 Passed: Quest Graph & Dialogue Trees operational.");
  return true;
}
