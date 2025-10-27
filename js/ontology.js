// js/ontology.js - 学習オントロジーの管理

class LearningOntology {
  constructor() {
    this.concepts = new Map();
    this.relations = new Map();
  }

  // オントロジーデータの読み込み
  async loadOntology(ontologyData) {
    console.log("📚 オントロジーを読み込み中...");

    // 概念の追加
    for (const [conceptId, conceptData] of Object.entries(
      ontologyData.concepts
    )) {
      this.addConcept(conceptId, conceptData);
    }

    // 関係の追加
    for (const relation of ontologyData.relations) {
      this.addRelation(
        relation.from,
        relation.to,
        relation.type,
        relation.strength || 1.0
      );
    }

    console.log(`✅ ${this.concepts.size}個の概念を読み込みました`);
    console.log(`✅ ${this.relations.size}個の関係を読み込みました`);
  }

  // 概念の追加
  addConcept(id, properties) {
    this.concepts.set(id, {
      id: id,
      ...properties,
      addedAt: new Date(),
    });
  }

  // 関係の追加
  addRelation(fromConcept, toConcept, relationType, strength = 1.0) {
    const relationKey = `${fromConcept}-${relationType}-${toConcept}`;
    this.relations.set(relationKey, {
      from: fromConcept,
      to: toConcept,
      type: relationType,
      strength: strength,
    });
  }

  // 概念の取得
  getConcept(conceptId) {
    return this.concepts.get(conceptId);
  }

  // 関連概念の探索（幅優先探索）
  findRelatedConcepts(conceptId, maxDepth = 2) {
    const visited = new Set();
    const related = new Set();
    const queue = [{ concept: conceptId, depth: 0 }];

    while (queue.length > 0) {
      const { concept, depth } = queue.shift();

      // 訪問済みまたは深さ超過ならスキップ
      if (visited.has(concept) || depth > maxDepth) {
        continue;
      }

      visited.add(concept);

      // 最初の概念以外は結果に追加
      if (depth > 0) {
        related.add(concept);
      }

      // 直接関係のある概念を探索
      for (const [key, relation] of this.relations) {
        if (relation.from === concept && !visited.has(relation.to)) {
          queue.push({ concept: relation.to, depth: depth + 1 });
        }
        // 双方向で探索（related関係など）
        if (relation.to === concept && !visited.has(relation.from)) {
          queue.push({ concept: relation.from, depth: depth + 1 });
        }
      }
    }

    return Array.from(related);
  }

  // 前提知識チェーン（prerequisite関係をたどる）
  getPrerequisiteChain(conceptId) {
    const chain = [];
    const concept = this.concepts.get(conceptId);

    if (concept && concept.prerequisites) {
      for (const prereq of concept.prerequisites) {
        chain.push(prereq);
        // 再帰的に前提知識を取得
        chain.push(...this.getPrerequisiteChain(prereq));
      }
    }

    // 重複を除去
    return [...new Set(chain)];
  }

  // デバッグ用：オントロジーの状態を表示
  printOntology() {
    console.log("=== オントロジーの状態 ===");
    console.log("概念数:", this.concepts.size);
    console.log("関係数:", this.relations.size);

    console.log("\n概念一覧:");
    for (const [id, concept] of this.concepts) {
      console.log(`- ${id}: ${concept.label} (${concept.level})`);
    }

    console.log("\n関係一覧:");
    for (const [key, relation] of this.relations) {
      console.log(`- ${relation.from} --[${relation.type}]--> ${relation.to}`);
    }
  }
}