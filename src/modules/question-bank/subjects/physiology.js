/**
 * 生理学 题目集 — 120题
 * 难度分布: common(60) / rare(36) / epic(18) / legendary(6)
 */
(function() {
  var MediCard = window.MediCard || {};
  MediCard.QuestionBank = MediCard.QuestionBank || {};
  MediCard.QuestionBank['physiology'] = [
  {
    "id": "physiology-common-001",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "生理学综合技能",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "抗利尿激素(ADH/血管升压素)的主要作用是？",
    "options": [
      "A. 增加肾远曲小管和集合管对水的通透性→尿量减少",
      "B. 增加Na⁺排泄",
      "C. 降低血压",
      "D. 促进胰岛素分泌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ADH(下丘脑视上核/室旁核合成,垂体后叶储存分泌)结合V2受体→cAMP→AQP2水通道蛋白插入集合管腔膜→水重吸收增加→尿液浓缩。高渗/低血容量/血管紧张素Ⅱ刺激ADH释放。",
    "textbookReference": "《生理学》第9版 P260",
    "knowledgePoint": "ADH",
    "tags": [
      "ADH",
      "水重吸收"
    ]
  },
  {
    "id": "physiology-common-002",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "生理学复习修复",
    "energyCost": 1,
    "cardEffect": "恢复2点HP",
    "question": "糖皮质激素(皮质醇)的分泌主要受什么调控？",
    "options": [
      "A. 下丘脑-垂体-肾上腺轴(CRH→ACTH→皮质醇)",
      "B. 血糖直接调控",
      "C. 肾素-血管紧张素系统",
      "D. 甲状旁腺激素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "HPA轴:下丘脑室旁核分泌CRH→垂体前叶分泌ACTH→肾上腺皮质束状带分泌皮质醇。皮质醇有昼夜节律(早晨高/夜间低)和负反馈抑制。应激时激活。",
    "textbookReference": "《生理学》第9版 P390",
    "knowledgePoint": "肾上腺皮质激素",
    "tags": [
      "皮质醇",
      "HPA轴"
    ]
  },
  {
    "id": "physiology-common-003",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "正常成人的肾血浆流量(RPF)约为？",
    "options": [
      "A. 600-700 mL/min",
      "B. 100-200 mL/min",
      "C. 1200-1500 mL/min",
      "D. 50-100 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "RPF约600-700mL/min(占CO的20-25%)。有效肾血浆流量(ERPF)经PAH清除率测定。RBF(肾血流量)=RPF/(1-Hct)。",
    "textbookReference": "《生理学》第9版 P252",
    "knowledgePoint": "肾血流量",
    "tags": [
      "RPF",
      "肾脏"
    ]
  },
  {
    "id": "physiology-common-004",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "体温调节中枢位于？",
    "options": [
      "A. 下丘脑视前区(PO/AH)",
      "B. 延髓",
      "C. 小脑",
      "D. 脊髓"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "PO/AH(视前区-下丘脑前部)含热敏神经元和冷敏神经元，是体温调节的整合中枢，通过散热和产热机制维持体温恒定。",
    "textbookReference": "《生理学》第9版 P220",
    "knowledgePoint": "体温调节",
    "tags": [
      "下丘脑",
      "体温"
    ]
  },
  {
    "id": "physiology-common-005",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-common-006",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 2,
    "cardEffect": "获得4点护盾",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-common-007",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-common-008",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 2,
    "cardEffect": "获得3点护盾",
    "question": "糖皮质激素(皮质醇)的分泌主要受什么调控？",
    "options": [
      "A. 下丘脑-垂体-肾上腺轴(CRH→ACTH→皮质醇)",
      "B. 血糖直接调控",
      "C. 肾素-血管紧张素系统",
      "D. 甲状旁腺激素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "HPA轴:下丘脑室旁核分泌CRH→垂体前叶分泌ACTH→肾上腺皮质束状带分泌皮质醇。皮质醇有昼夜节律(早晨高/夜间低)和负反馈抑制。应激时激活。",
    "textbookReference": "《生理学》第9版 P390",
    "knowledgePoint": "肾上腺皮质激素",
    "tags": [
      "皮质醇",
      "HPA轴"
    ]
  },
  {
    "id": "physiology-common-009",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "生理学复习修复",
    "energyCost": 1,
    "cardEffect": "恢复2点HP",
    "question": "体温调节中枢位于？",
    "options": [
      "A. 下丘脑视前区(PO/AH)",
      "B. 延髓",
      "C. 小脑",
      "D. 脊髓"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "PO/AH(视前区-下丘脑前部)含热敏神经元和冷敏神经元，是体温调节的整合中枢，通过散热和产热机制维持体温恒定。",
    "textbookReference": "《生理学》第9版 P220",
    "knowledgePoint": "体温调节",
    "tags": [
      "下丘脑",
      "体温"
    ]
  },
  {
    "id": "physiology-common-010",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 2,
    "cardEffect": "获得2点护盾",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-common-011",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 1,
    "cardEffect": "恢复3点HP",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-common-012",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-common-013",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 2,
    "cardEffect": "获得3点护盾",
    "question": "正常人动脉血pH值为？",
    "options": [
      "A. 7.35-7.45",
      "B. 7.0-7.2",
      "C. 7.5-7.6",
      "D. 6.8-7.0"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉血正常pH为7.35-7.45。pH<7.35为酸中毒，>7.45为碱中毒。主要通过肺(呼吸调节CO₂)、肾(调节HCO₃⁻)和缓冲系统(碳酸氢盐/蛋白质/磷酸盐)维持。",
    "textbookReference": "《生理学》第9版 P235",
    "knowledgePoint": "酸碱平衡",
    "tags": [
      "pH",
      "酸碱平衡"
    ]
  },
  {
    "id": "physiology-common-014",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "special",
    "cardName": "生理学综合技能",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-common-015",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-common-016",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "抗利尿激素(ADH/血管升压素)的主要作用是？",
    "options": [
      "A. 增加肾远曲小管和集合管对水的通透性→尿量减少",
      "B. 增加Na⁺排泄",
      "C. 降低血压",
      "D. 促进胰岛素分泌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ADH(下丘脑视上核/室旁核合成,垂体后叶储存分泌)结合V2受体→cAMP→AQP2水通道蛋白插入集合管腔膜→水重吸收增加→尿液浓缩。高渗/低血容量/血管紧张素Ⅱ刺激ADH释放。",
    "textbookReference": "《生理学》第9版 P260",
    "knowledgePoint": "ADH",
    "tags": [
      "ADH",
      "水重吸收"
    ]
  },
  {
    "id": "physiology-common-017",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-common-018",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "关于心肌自律性最高的部位是？",
    "options": [
      "A. 窦房结",
      "B. 房室结",
      "C. 浦肯野纤维",
      "D. 心房肌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "窦房结自律性最高(60-100次/分)→房室结(40-60次/分)→浦肯野纤维(20-40次/分)。窦房结是正常心脏起搏点。自律性基础是4期自动去极化(If电流/Ica-T)。",
    "textbookReference": "《生理学》第9版 P85",
    "knowledgePoint": "心肌自律性",
    "tags": [
      "窦房结",
      "自律性"
    ]
  },
  {
    "id": "physiology-common-019",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-common-020",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "关于心肌自律性最高的部位是？",
    "options": [
      "A. 窦房结",
      "B. 房室结",
      "C. 浦肯野纤维",
      "D. 心房肌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "窦房结自律性最高(60-100次/分)→房室结(40-60次/分)→浦肯野纤维(20-40次/分)。窦房结是正常心脏起搏点。自律性基础是4期自动去极化(If电流/Ica-T)。",
    "textbookReference": "《生理学》第9版 P85",
    "knowledgePoint": "心肌自律性",
    "tags": [
      "窦房结",
      "自律性"
    ]
  },
  {
    "id": "physiology-common-021",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识巩固治疗",
    "energyCost": 2,
    "cardEffect": "恢复3点HP",
    "question": "糖皮质激素(皮质醇)的分泌主要受什么调控？",
    "options": [
      "A. 下丘脑-垂体-肾上腺轴(CRH→ACTH→皮质醇)",
      "B. 血糖直接调控",
      "C. 肾素-血管紧张素系统",
      "D. 甲状旁腺激素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "HPA轴:下丘脑室旁核分泌CRH→垂体前叶分泌ACTH→肾上腺皮质束状带分泌皮质醇。皮质醇有昼夜节律(早晨高/夜间低)和负反馈抑制。应激时激活。",
    "textbookReference": "《生理学》第9版 P390",
    "knowledgePoint": "肾上腺皮质激素",
    "tags": [
      "皮质醇",
      "HPA轴"
    ]
  },
  {
    "id": "physiology-common-022",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 2,
    "cardEffect": "获得4点护盾",
    "question": "糖皮质激素(皮质醇)的分泌主要受什么调控？",
    "options": [
      "A. 下丘脑-垂体-肾上腺轴(CRH→ACTH→皮质醇)",
      "B. 血糖直接调控",
      "C. 肾素-血管紧张素系统",
      "D. 甲状旁腺激素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "HPA轴:下丘脑室旁核分泌CRH→垂体前叶分泌ACTH→肾上腺皮质束状带分泌皮质醇。皮质醇有昼夜节律(早晨高/夜间低)和负反馈抑制。应激时激活。",
    "textbookReference": "《生理学》第9版 P390",
    "knowledgePoint": "肾上腺皮质激素",
    "tags": [
      "皮质醇",
      "HPA轴"
    ]
  },
  {
    "id": "physiology-common-023",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 1,
    "cardEffect": "恢复4点HP",
    "question": "抗利尿激素(ADH/血管升压素)的主要作用是？",
    "options": [
      "A. 增加肾远曲小管和集合管对水的通透性→尿量减少",
      "B. 增加Na⁺排泄",
      "C. 降低血压",
      "D. 促进胰岛素分泌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ADH(下丘脑视上核/室旁核合成,垂体后叶储存分泌)结合V2受体→cAMP→AQP2水通道蛋白插入集合管腔膜→水重吸收增加→尿液浓缩。高渗/低血容量/血管紧张素Ⅱ刺激ADH释放。",
    "textbookReference": "《生理学》第9版 P260",
    "knowledgePoint": "ADH",
    "tags": [
      "ADH",
      "水重吸收"
    ]
  },
  {
    "id": "physiology-common-024",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "听觉的感受器(螺旋器/Corti器)位于？",
    "options": [
      "A. 耳蜗基底膜",
      "B. 鼓膜",
      "C. 前庭",
      "D. 听神经节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "螺旋器( Corti器)位于耳蜗基底膜上，含内毛细胞(约3500个，90-95%传入)和外毛细胞(约12000个，调节基底膜振动)。频率差异由基底膜的机械特性决定(底部高频/顶部低频)。",
    "textbookReference": "《生理学》第9版 P320",
    "knowledgePoint": "听觉",
    "tags": [
      "螺旋器",
      "耳蜗"
    ]
  },
  {
    "id": "physiology-common-025",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-common-026",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-common-027",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "体温调节中枢位于？",
    "options": [
      "A. 下丘脑视前区(PO/AH)",
      "B. 延髓",
      "C. 小脑",
      "D. 脊髓"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "PO/AH(视前区-下丘脑前部)含热敏神经元和冷敏神经元，是体温调节的整合中枢，通过散热和产热机制维持体温恒定。",
    "textbookReference": "《生理学》第9版 P220",
    "knowledgePoint": "体温调节",
    "tags": [
      "下丘脑",
      "体温"
    ]
  },
  {
    "id": "physiology-common-028",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "胃壁细胞分泌的物质不包括？",
    "options": [
      "A. 胃蛋白酶原",
      "B. 盐酸(HCl)",
      "C. 内因子(Intrinsic factor)",
      "D. 都是壁细胞分泌的"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "胃蛋白酶原由主细胞(chief cell)分泌，壁细胞(parietal cell)分泌HCl和内因子。HCl由H⁺/K⁺-ATP酶(质子泵)主动分泌。",
    "textbookReference": "《生理学》第9版 P185",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "壁细胞",
      "主细胞"
    ]
  },
  {
    "id": "physiology-common-029",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 1,
    "cardEffect": "恢复4点HP",
    "question": "正常人动脉血pH值为？",
    "options": [
      "A. 7.35-7.45",
      "B. 7.0-7.2",
      "C. 7.5-7.6",
      "D. 6.8-7.0"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉血正常pH为7.35-7.45。pH<7.35为酸中毒，>7.45为碱中毒。主要通过肺(呼吸调节CO₂)、肾(调节HCO₃⁻)和缓冲系统(碳酸氢盐/蛋白质/磷酸盐)维持。",
    "textbookReference": "《生理学》第9版 P235",
    "knowledgePoint": "酸碱平衡",
    "tags": [
      "pH",
      "酸碱平衡"
    ]
  },
  {
    "id": "physiology-common-030",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 1,
    "cardEffect": "获得2点护盾",
    "question": "肾小球滤过率(GFR)的正常值约为？",
    "options": [
      "A. 125 mL/min",
      "B. 500 mL/min",
      "C. 1000 mL/min",
      "D. 50 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "GFR正常值约125mL/min(180L/天)。测定GFR的金标准是菊粉清除率，临床上常用肌酐清除率(Ccr)估算。",
    "textbookReference": "《生理学》第9版 P250",
    "knowledgePoint": "GFR",
    "tags": [
      "GFR",
      "肾小球滤过"
    ]
  },
  {
    "id": "physiology-common-031",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-common-032",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "听觉的感受器(螺旋器/Corti器)位于？",
    "options": [
      "A. 耳蜗基底膜",
      "B. 鼓膜",
      "C. 前庭",
      "D. 听神经节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "螺旋器( Corti器)位于耳蜗基底膜上，含内毛细胞(约3500个，90-95%传入)和外毛细胞(约12000个，调节基底膜振动)。频率差异由基底膜的机械特性决定(底部高频/顶部低频)。",
    "textbookReference": "《生理学》第9版 P320",
    "knowledgePoint": "听觉",
    "tags": [
      "螺旋器",
      "耳蜗"
    ]
  },
  {
    "id": "physiology-common-033",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "正常人动脉血pH值为？",
    "options": [
      "A. 7.35-7.45",
      "B. 7.0-7.2",
      "C. 7.5-7.6",
      "D. 6.8-7.0"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉血正常pH为7.35-7.45。pH<7.35为酸中毒，>7.45为碱中毒。主要通过肺(呼吸调节CO₂)、肾(调节HCO₃⁻)和缓冲系统(碳酸氢盐/蛋白质/磷酸盐)维持。",
    "textbookReference": "《生理学》第9版 P235",
    "knowledgePoint": "酸碱平衡",
    "tags": [
      "pH",
      "酸碱平衡"
    ]
  },
  {
    "id": "physiology-common-034",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-common-035",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-common-036",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-common-037",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-common-038",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-common-039",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 2,
    "cardEffect": "获得3点护盾",
    "question": "肾小球滤过率(GFR)的正常值约为？",
    "options": [
      "A. 125 mL/min",
      "B. 500 mL/min",
      "C. 1000 mL/min",
      "D. 50 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "GFR正常值约125mL/min(180L/天)。测定GFR的金标准是菊粉清除率，临床上常用肌酐清除率(Ccr)估算。",
    "textbookReference": "《生理学》第9版 P250",
    "knowledgePoint": "GFR",
    "tags": [
      "GFR",
      "肾小球滤过"
    ]
  },
  {
    "id": "physiology-common-040",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-common-041",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-common-042",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-common-043",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-common-044",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-common-045",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-common-046",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "胃壁细胞分泌的物质不包括？",
    "options": [
      "A. 胃蛋白酶原",
      "B. 盐酸(HCl)",
      "C. 内因子(Intrinsic factor)",
      "D. 都是壁细胞分泌的"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "胃蛋白酶原由主细胞(chief cell)分泌，壁细胞(parietal cell)分泌HCl和内因子。HCl由H⁺/K⁺-ATP酶(质子泵)主动分泌。",
    "textbookReference": "《生理学》第9版 P185",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "壁细胞",
      "主细胞"
    ]
  },
  {
    "id": "physiology-common-047",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "抗利尿激素(ADH/血管升压素)的主要作用是？",
    "options": [
      "A. 增加肾远曲小管和集合管对水的通透性→尿量减少",
      "B. 增加Na⁺排泄",
      "C. 降低血压",
      "D. 促进胰岛素分泌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ADH(下丘脑视上核/室旁核合成,垂体后叶储存分泌)结合V2受体→cAMP→AQP2水通道蛋白插入集合管腔膜→水重吸收增加→尿液浓缩。高渗/低血容量/血管紧张素Ⅱ刺激ADH释放。",
    "textbookReference": "《生理学》第9版 P260",
    "knowledgePoint": "ADH",
    "tags": [
      "ADH",
      "水重吸收"
    ]
  },
  {
    "id": "physiology-common-048",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 2,
    "cardEffect": "获得4点护盾",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-common-049",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 1,
    "cardEffect": "获得2点护盾",
    "question": "糖皮质激素(皮质醇)的分泌主要受什么调控？",
    "options": [
      "A. 下丘脑-垂体-肾上腺轴(CRH→ACTH→皮质醇)",
      "B. 血糖直接调控",
      "C. 肾素-血管紧张素系统",
      "D. 甲状旁腺激素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "HPA轴:下丘脑室旁核分泌CRH→垂体前叶分泌ACTH→肾上腺皮质束状带分泌皮质醇。皮质醇有昼夜节律(早晨高/夜间低)和负反馈抑制。应激时激活。",
    "textbookReference": "《生理学》第9版 P390",
    "knowledgePoint": "肾上腺皮质激素",
    "tags": [
      "皮质醇",
      "HPA轴"
    ]
  },
  {
    "id": "physiology-common-050",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "胰岛素由胰岛的哪种细胞分泌？",
    "options": [
      "A. β细胞( B细胞)",
      "B. α细胞",
      "C. δ细胞",
      "D. PP细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "胰岛β细胞分泌胰岛素(降血糖)，α细胞分泌胰高血糖素(升血糖)，δ细胞分泌生长抑素，PP细胞分泌胰多肽。",
    "textbookReference": "《生理学》第9版 P380",
    "knowledgePoint": "胰岛激素",
    "tags": [
      "胰岛素",
      "β细胞"
    ]
  },
  {
    "id": "physiology-common-051",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "生理学综合技能",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "肾小球滤过率(GFR)的正常值约为？",
    "options": [
      "A. 125 mL/min",
      "B. 500 mL/min",
      "C. 1000 mL/min",
      "D. 50 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "GFR正常值约125mL/min(180L/天)。测定GFR的金标准是菊粉清除率，临床上常用肌酐清除率(Ccr)估算。",
    "textbookReference": "《生理学》第9版 P250",
    "knowledgePoint": "GFR",
    "tags": [
      "GFR",
      "肾小球滤过"
    ]
  },
  {
    "id": "physiology-common-052",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 2,
    "cardEffect": "获得2点护盾",
    "question": "听觉的感受器(螺旋器/Corti器)位于？",
    "options": [
      "A. 耳蜗基底膜",
      "B. 鼓膜",
      "C. 前庭",
      "D. 听神经节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "螺旋器( Corti器)位于耳蜗基底膜上，含内毛细胞(约3500个，90-95%传入)和外毛细胞(约12000个，调节基底膜振动)。频率差异由基底膜的机械特性决定(底部高频/顶部低频)。",
    "textbookReference": "《生理学》第9版 P320",
    "knowledgePoint": "听觉",
    "tags": [
      "螺旋器",
      "耳蜗"
    ]
  },
  {
    "id": "physiology-common-053",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 2,
    "cardEffect": "获得2点护盾",
    "question": "正常成人的肾血浆流量(RPF)约为？",
    "options": [
      "A. 600-700 mL/min",
      "B. 100-200 mL/min",
      "C. 1200-1500 mL/min",
      "D. 50-100 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "RPF约600-700mL/min(占CO的20-25%)。有效肾血浆流量(ERPF)经PAH清除率测定。RBF(肾血流量)=RPF/(1-Hct)。",
    "textbookReference": "《生理学》第9版 P252",
    "knowledgePoint": "肾血流量",
    "tags": [
      "RPF",
      "肾脏"
    ]
  },
  {
    "id": "physiology-common-054",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 2,
    "cardEffect": "获得2点护盾",
    "question": "听觉的感受器(螺旋器/Corti器)位于？",
    "options": [
      "A. 耳蜗基底膜",
      "B. 鼓膜",
      "C. 前庭",
      "D. 听神经节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "螺旋器( Corti器)位于耳蜗基底膜上，含内毛细胞(约3500个，90-95%传入)和外毛细胞(约12000个，调节基底膜振动)。频率差异由基底膜的机械特性决定(底部高频/顶部低频)。",
    "textbookReference": "《生理学》第9版 P320",
    "knowledgePoint": "听觉",
    "tags": [
      "螺旋器",
      "耳蜗"
    ]
  },
  {
    "id": "physiology-common-055",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 1,
    "cardEffect": "恢复3点HP",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-common-056",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "生理学复习修复",
    "energyCost": 2,
    "cardEffect": "恢复3点HP",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-common-057",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "静息电位主要由哪种离子决定？",
    "options": [
      "A. K⁺平衡电位",
      "B. Na⁺平衡电位",
      "C. Ca²⁺平衡电位",
      "D. Cl⁻平衡电位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "静息电位主要由K⁺外流形成的K⁺平衡电位决定，细胞膜在静息状态下对K⁺通透性最高。",
    "textbookReference": "《生理学》第9版 P25",
    "knowledgePoint": "静息电位",
    "tags": [
      "静息电位",
      "K⁺"
    ]
  },
  {
    "id": "physiology-common-058",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "静息电位主要由哪种离子决定？",
    "options": [
      "A. K⁺平衡电位",
      "B. Na⁺平衡电位",
      "C. Ca²⁺平衡电位",
      "D. Cl⁻平衡电位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "静息电位主要由K⁺外流形成的K⁺平衡电位决定，细胞膜在静息状态下对K⁺通透性最高。",
    "textbookReference": "《生理学》第9版 P25",
    "knowledgePoint": "静息电位",
    "tags": [
      "静息电位",
      "K⁺"
    ]
  },
  {
    "id": "physiology-common-059",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 2,
    "cardEffect": "获得2点护盾",
    "question": "静息电位主要由哪种离子决定？",
    "options": [
      "A. K⁺平衡电位",
      "B. Na⁺平衡电位",
      "C. Ca²⁺平衡电位",
      "D. Cl⁻平衡电位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "静息电位主要由K⁺外流形成的K⁺平衡电位决定，细胞膜在静息状态下对K⁺通透性最高。",
    "textbookReference": "《生理学》第9版 P25",
    "knowledgePoint": "静息电位",
    "tags": [
      "静息电位",
      "K⁺"
    ]
  },
  {
    "id": "physiology-common-060",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-rare-001",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 3,
    "cardEffect": "恢复7点HP",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-002",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 3,
    "cardEffect": "造成4点伤害",
    "question": "静息电位主要由哪种离子决定？",
    "options": [
      "A. K⁺平衡电位",
      "B. Na⁺平衡电位",
      "C. Ca²⁺平衡电位",
      "D. Cl⁻平衡电位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "静息电位主要由K⁺外流形成的K⁺平衡电位决定，细胞膜在静息状态下对K⁺通透性最高。",
    "textbookReference": "《生理学》第9版 P25",
    "knowledgePoint": "静息电位",
    "tags": [
      "静息电位",
      "K⁺"
    ]
  },
  {
    "id": "physiology-rare-003",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 3,
    "cardEffect": "造成6点伤害",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-rare-004",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-005",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 3,
    "cardEffect": "获得6点护盾",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-rare-006",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-rare-007",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "生理学综合技能",
    "energyCost": 3,
    "cardEffect": "造成7点伤害",
    "question": "突触传递中，兴奋性神经递质导致突触后膜产生？",
    "options": [
      "A. EPSP(兴奋性突触后电位,去极化)",
      "B. IPSP(抑制性突触后电位,超极化)",
      "C. 动作电位直接产生",
      "D. 膜电位无变化"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "兴奋性递质(如谷氨酸)→AMPA受体→Na⁺/K⁺通透→去极化(EPSP)。抑制性递质(GABA/Gly)→Cl⁻通道→超极化(IPSP)。EPSP总和达到阈值→动作电位。",
    "textbookReference": "《生理学》第9版 P290",
    "knowledgePoint": "突触传递",
    "tags": [
      "EPSP",
      "突触"
    ]
  },
  {
    "id": "physiology-rare-008",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 3,
    "cardEffect": "获得8点护盾",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-009",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-rare-010",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识巩固治疗",
    "energyCost": 2,
    "cardEffect": "恢复4点HP",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-rare-011",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-rare-012",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 2,
    "cardEffect": "获得5点护盾",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-rare-013",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "生理学复习修复",
    "energyCost": 2,
    "cardEffect": "恢复4点HP",
    "question": "突触传递中，兴奋性神经递质导致突触后膜产生？",
    "options": [
      "A. EPSP(兴奋性突触后电位,去极化)",
      "B. IPSP(抑制性突触后电位,超极化)",
      "C. 动作电位直接产生",
      "D. 膜电位无变化"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "兴奋性递质(如谷氨酸)→AMPA受体→Na⁺/K⁺通透→去极化(EPSP)。抑制性递质(GABA/Gly)→Cl⁻通道→超极化(IPSP)。EPSP总和达到阈值→动作电位。",
    "textbookReference": "《生理学》第9版 P290",
    "knowledgePoint": "突触传递",
    "tags": [
      "EPSP",
      "突触"
    ]
  },
  {
    "id": "physiology-rare-014",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "听觉的感受器(螺旋器/Corti器)位于？",
    "options": [
      "A. 耳蜗基底膜",
      "B. 鼓膜",
      "C. 前庭",
      "D. 听神经节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "螺旋器( Corti器)位于耳蜗基底膜上，含内毛细胞(约3500个，90-95%传入)和外毛细胞(约12000个，调节基底膜振动)。频率差异由基底膜的机械特性决定(底部高频/顶部低频)。",
    "textbookReference": "《生理学》第9版 P320",
    "knowledgePoint": "听觉",
    "tags": [
      "螺旋器",
      "耳蜗"
    ]
  },
  {
    "id": "physiology-rare-015",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-016",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 3,
    "cardEffect": "恢复8点HP",
    "question": "听觉的感受器(螺旋器/Corti器)位于？",
    "options": [
      "A. 耳蜗基底膜",
      "B. 鼓膜",
      "C. 前庭",
      "D. 听神经节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "螺旋器( Corti器)位于耳蜗基底膜上，含内毛细胞(约3500个，90-95%传入)和外毛细胞(约12000个，调节基底膜振动)。频率差异由基底膜的机械特性决定(底部高频/顶部低频)。",
    "textbookReference": "《生理学》第9版 P320",
    "knowledgePoint": "听觉",
    "tags": [
      "螺旋器",
      "耳蜗"
    ]
  },
  {
    "id": "physiology-rare-017",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-rare-018",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 3,
    "cardEffect": "造成4点伤害",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-rare-019",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "肾小球滤过率(GFR)的正常值约为？",
    "options": [
      "A. 125 mL/min",
      "B. 500 mL/min",
      "C. 1000 mL/min",
      "D. 50 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "GFR正常值约125mL/min(180L/天)。测定GFR的金标准是菊粉清除率，临床上常用肌酐清除率(Ccr)估算。",
    "textbookReference": "《生理学》第9版 P250",
    "knowledgePoint": "GFR",
    "tags": [
      "GFR",
      "肾小球滤过"
    ]
  },
  {
    "id": "physiology-rare-020",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 2,
    "cardEffect": "获得6点护盾",
    "question": "静息电位主要由哪种离子决定？",
    "options": [
      "A. K⁺平衡电位",
      "B. Na⁺平衡电位",
      "C. Ca²⁺平衡电位",
      "D. Cl⁻平衡电位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "静息电位主要由K⁺外流形成的K⁺平衡电位决定，细胞膜在静息状态下对K⁺通透性最高。",
    "textbookReference": "《生理学》第9版 P25",
    "knowledgePoint": "静息电位",
    "tags": [
      "静息电位",
      "K⁺"
    ]
  },
  {
    "id": "physiology-rare-021",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 2,
    "cardEffect": "造成7点伤害",
    "question": "肾小球滤过率(GFR)的正常值约为？",
    "options": [
      "A. 125 mL/min",
      "B. 500 mL/min",
      "C. 1000 mL/min",
      "D. 50 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "GFR正常值约125mL/min(180L/天)。测定GFR的金标准是菊粉清除率，临床上常用肌酐清除率(Ccr)估算。",
    "textbookReference": "《生理学》第9版 P250",
    "knowledgePoint": "GFR",
    "tags": [
      "GFR",
      "肾小球滤过"
    ]
  },
  {
    "id": "physiology-rare-022",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "肾小球滤过率(GFR)的正常值约为？",
    "options": [
      "A. 125 mL/min",
      "B. 500 mL/min",
      "C. 1000 mL/min",
      "D. 50 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "GFR正常值约125mL/min(180L/天)。测定GFR的金标准是菊粉清除率，临床上常用肌酐清除率(Ccr)估算。",
    "textbookReference": "《生理学》第9版 P250",
    "knowledgePoint": "GFR",
    "tags": [
      "GFR",
      "肾小球滤过"
    ]
  },
  {
    "id": "physiology-rare-023",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 3,
    "cardEffect": "造成8点伤害",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-rare-024",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 2,
    "cardEffect": "获得4点护盾",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-025",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 3,
    "cardEffect": "获得4点护盾",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-rare-026",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-027",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 3,
    "cardEffect": "造成7点伤害",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-028",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-rare-029",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 2,
    "cardEffect": "获得8点护盾",
    "question": "正常成人的肾血浆流量(RPF)约为？",
    "options": [
      "A. 600-700 mL/min",
      "B. 100-200 mL/min",
      "C. 1200-1500 mL/min",
      "D. 50-100 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "RPF约600-700mL/min(占CO的20-25%)。有效肾血浆流量(ERPF)经PAH清除率测定。RBF(肾血流量)=RPF/(1-Hct)。",
    "textbookReference": "《生理学》第9版 P252",
    "knowledgePoint": "肾血流量",
    "tags": [
      "RPF",
      "肾脏"
    ]
  },
  {
    "id": "physiology-rare-030",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 3,
    "cardEffect": "造成6点伤害",
    "question": "正常成人的肾血浆流量(RPF)约为？",
    "options": [
      "A. 600-700 mL/min",
      "B. 100-200 mL/min",
      "C. 1200-1500 mL/min",
      "D. 50-100 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "RPF约600-700mL/min(占CO的20-25%)。有效肾血浆流量(ERPF)经PAH清除率测定。RBF(肾血流量)=RPF/(1-Hct)。",
    "textbookReference": "《生理学》第9版 P252",
    "knowledgePoint": "肾血流量",
    "tags": [
      "RPF",
      "肾脏"
    ]
  },
  {
    "id": "physiology-rare-031",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 3,
    "cardEffect": "获得6点护盾",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-rare-032",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 2,
    "cardEffect": "获得5点护盾",
    "question": "体温调节中枢位于？",
    "options": [
      "A. 下丘脑视前区(PO/AH)",
      "B. 延髓",
      "C. 小脑",
      "D. 脊髓"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "PO/AH(视前区-下丘脑前部)含热敏神经元和冷敏神经元，是体温调节的整合中枢，通过散热和产热机制维持体温恒定。",
    "textbookReference": "《生理学》第9版 P220",
    "knowledgePoint": "体温调节",
    "tags": [
      "下丘脑",
      "体温"
    ]
  },
  {
    "id": "physiology-rare-033",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成7点伤害",
    "question": "关于心肌自律性最高的部位是？",
    "options": [
      "A. 窦房结",
      "B. 房室结",
      "C. 浦肯野纤维",
      "D. 心房肌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "窦房结自律性最高(60-100次/分)→房室结(40-60次/分)→浦肯野纤维(20-40次/分)。窦房结是正常心脏起搏点。自律性基础是4期自动去极化(If电流/Ica-T)。",
    "textbookReference": "《生理学》第9版 P85",
    "knowledgePoint": "心肌自律性",
    "tags": [
      "窦房结",
      "自律性"
    ]
  },
  {
    "id": "physiology-rare-034",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-rare-035",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 3,
    "cardEffect": "造成4点伤害",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-rare-036",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 3,
    "cardEffect": "获得4点护盾",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-epic-001",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 5,
    "cardEffect": "获得15点护盾",
    "question": "正常人动脉血pH值为？",
    "options": [
      "A. 7.35-7.45",
      "B. 7.0-7.2",
      "C. 7.5-7.6",
      "D. 6.8-7.0"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉血正常pH为7.35-7.45。pH<7.35为酸中毒，>7.45为碱中毒。主要通过肺(呼吸调节CO₂)、肾(调节HCO₃⁻)和缓冲系统(碳酸氢盐/蛋白质/磷酸盐)维持。",
    "textbookReference": "《生理学》第9版 P235",
    "knowledgePoint": "酸碱平衡",
    "tags": [
      "pH",
      "酸碱平衡"
    ]
  },
  {
    "id": "physiology-epic-002",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 4,
    "cardEffect": "获得10点护盾",
    "question": "正常成人的肾血浆流量(RPF)约为？",
    "options": [
      "A. 600-700 mL/min",
      "B. 100-200 mL/min",
      "C. 1200-1500 mL/min",
      "D. 50-100 mL/min"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "RPF约600-700mL/min(占CO的20-25%)。有效肾血浆流量(ERPF)经PAH清除率测定。RBF(肾血流量)=RPF/(1-Hct)。",
    "textbookReference": "《生理学》第9版 P252",
    "knowledgePoint": "肾血流量",
    "tags": [
      "RPF",
      "肾脏"
    ]
  },
  {
    "id": "physiology-epic-003",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 5,
    "cardEffect": "造成13点伤害",
    "question": "正常人动脉血pH值为？",
    "options": [
      "A. 7.35-7.45",
      "B. 7.0-7.2",
      "C. 7.5-7.6",
      "D. 6.8-7.0"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉血正常pH为7.35-7.45。pH<7.35为酸中毒，>7.45为碱中毒。主要通过肺(呼吸调节CO₂)、肾(调节HCO₃⁻)和缓冲系统(碳酸氢盐/蛋白质/磷酸盐)维持。",
    "textbookReference": "《生理学》第9版 P235",
    "knowledgePoint": "酸碱平衡",
    "tags": [
      "pH",
      "酸碱平衡"
    ]
  },
  {
    "id": "physiology-epic-004",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 3,
    "cardEffect": "造成15点伤害",
    "question": "肺泡表面活性物质由哪种细胞分泌？",
    "options": [
      "A. Ⅱ型肺泡上皮细胞",
      "B. Ⅰ型肺泡上皮细胞",
      "C. 肺泡巨噬细胞",
      "D. Clara细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肺泡表面活性物质(主要是二棕榈酰卵磷脂DPPC)由Ⅱ型肺泡上皮细胞合成和分泌，降低肺泡表面张力、防止肺泡塌陷和肺水肿。",
    "textbookReference": "《生理学》第9版 P140",
    "knowledgePoint": "肺表面活性物质",
    "tags": [
      "表面活性物质",
      "DPPC"
    ]
  },
  {
    "id": "physiology-epic-005",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 4,
    "cardEffect": "造成10点伤害",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-epic-006",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 5,
    "cardEffect": "造成8点伤害",
    "question": "静息电位主要由哪种离子决定？",
    "options": [
      "A. K⁺平衡电位",
      "B. Na⁺平衡电位",
      "C. Ca²⁺平衡电位",
      "D. Cl⁻平衡电位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "静息电位主要由K⁺外流形成的K⁺平衡电位决定，细胞膜在静息状态下对K⁺通透性最高。",
    "textbookReference": "《生理学》第9版 P25",
    "knowledgePoint": "静息电位",
    "tags": [
      "静息电位",
      "K⁺"
    ]
  },
  {
    "id": "physiology-epic-007",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 3,
    "cardEffect": "获得13点护盾",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-epic-008",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 3,
    "cardEffect": "造成12点伤害",
    "question": "下列关于消化期胃液分泌的头期描述正确的是？",
    "options": [
      "A. 由食物的视觉/嗅觉/味觉/咀嚼引起，迷走神经介导",
      "B. 食物进入胃后引起",
      "C. 食物进入十二指肠后引起",
      "D. 与神经调节无关"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "头期胃液分泌占总量约30%，是典型的条件反射+非条件反射，迷走神经末梢释放ACh→壁细胞M₃受体→HCl分泌，同时刺激G细胞→胃泌素。",
    "textbookReference": "《生理学》第9版 P188",
    "knowledgePoint": "胃液分泌",
    "tags": [
      "头期",
      "胃液"
    ]
  },
  {
    "id": "physiology-epic-009",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 3,
    "cardEffect": "获得11点护盾",
    "question": "正常人动脉血pH值为？",
    "options": [
      "A. 7.35-7.45",
      "B. 7.0-7.2",
      "C. 7.5-7.6",
      "D. 6.8-7.0"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉血正常pH为7.35-7.45。pH<7.35为酸中毒，>7.45为碱中毒。主要通过肺(呼吸调节CO₂)、肾(调节HCO₃⁻)和缓冲系统(碳酸氢盐/蛋白质/磷酸盐)维持。",
    "textbookReference": "《生理学》第9版 P235",
    "knowledgePoint": "酸碱平衡",
    "tags": [
      "pH",
      "酸碱平衡"
    ]
  },
  {
    "id": "physiology-epic-010",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 4,
    "cardEffect": "获得8点护盾",
    "question": "关于动作电位的「全或无」特性，正确的是？",
    "options": [
      "A. 阈下刺激不产生动作电位，阈上刺激产生恒定幅度的动作电位",
      "B. 刺激越强动作电位幅度越大",
      "C. 动作电位可以叠加",
      "D. 动作电位不遵循不应期"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动作电位一旦触发达到阈值，就产生恒定幅度和波形的锋电位，与刺激强度无关。这是由电压门控Na⁺通道的正反馈激活决定的。",
    "textbookReference": "《生理学》第9版 P30",
    "knowledgePoint": "动作电位",
    "tags": [
      "全或无",
      "动作电位"
    ]
  },
  {
    "id": "physiology-epic-011",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 4,
    "cardEffect": "恢复14点HP",
    "question": "正常成人的动脉血压范围(理想值)是？",
    "options": [
      "A. 收缩压<120mmHg, 舒张压<80mmHg",
      "B. 收缩压<140mmHg, 舒张压<90mmHg",
      "C. 收缩压<100mmHg, 舒张压<60mmHg",
      "D. 收缩压<160mmHg, 舒张压<100mmHg"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "理想血压<120/80mmHg。高血压定义为≥140/90mmHg。血压由CO和TPR(总外周阻力)决定:MAP = CO × TPR。",
    "textbookReference": "《生理学》第9版 P105",
    "knowledgePoint": "血压",
    "tags": [
      "血压",
      "高血压"
    ]
  },
  {
    "id": "physiology-epic-012",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 5,
    "cardEffect": "恢复9点HP",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-epic-013",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 5,
    "cardEffect": "获得11点护盾",
    "question": "抗利尿激素(ADH/血管升压素)的主要作用是？",
    "options": [
      "A. 增加肾远曲小管和集合管对水的通透性→尿量减少",
      "B. 增加Na⁺排泄",
      "C. 降低血压",
      "D. 促进胰岛素分泌"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ADH(下丘脑视上核/室旁核合成,垂体后叶储存分泌)结合V2受体→cAMP→AQP2水通道蛋白插入集合管腔膜→水重吸收增加→尿液浓缩。高渗/低血容量/血管紧张素Ⅱ刺激ADH释放。",
    "textbookReference": "《生理学》第9版 P260",
    "knowledgePoint": "ADH",
    "tags": [
      "ADH",
      "水重吸收"
    ]
  },
  {
    "id": "physiology-epic-014",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 4,
    "cardEffect": "造成10点伤害",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-epic-015",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 4,
    "cardEffect": "造成8点伤害",
    "question": "糖皮质激素(皮质醇)的分泌主要受什么调控？",
    "options": [
      "A. 下丘脑-垂体-肾上腺轴(CRH→ACTH→皮质醇)",
      "B. 血糖直接调控",
      "C. 肾素-血管紧张素系统",
      "D. 甲状旁腺激素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "HPA轴:下丘脑室旁核分泌CRH→垂体前叶分泌ACTH→肾上腺皮质束状带分泌皮质醇。皮质醇有昼夜节律(早晨高/夜间低)和负反馈抑制。应激时激活。",
    "textbookReference": "《生理学》第9版 P390",
    "knowledgePoint": "肾上腺皮质激素",
    "tags": [
      "皮质醇",
      "HPA轴"
    ]
  },
  {
    "id": "physiology-epic-016",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "truefalse",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 4,
    "cardEffect": "造成13点伤害",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-epic-017",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 5,
    "cardEffect": "造成9点伤害",
    "question": "听觉的感受器(螺旋器/Corti器)位于？",
    "options": [
      "A. 耳蜗基底膜",
      "B. 鼓膜",
      "C. 前庭",
      "D. 听神经节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "螺旋器( Corti器)位于耳蜗基底膜上，含内毛细胞(约3500个，90-95%传入)和外毛细胞(约12000个，调节基底膜振动)。频率差异由基底膜的机械特性决定(底部高频/顶部低频)。",
    "textbookReference": "《生理学》第9版 P320",
    "knowledgePoint": "听觉",
    "tags": [
      "螺旋器",
      "耳蜗"
    ]
  },
  {
    "id": "physiology-epic-018",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学精准攻击",
    "energyCost": 3,
    "cardEffect": "造成15点伤害",
    "question": "正常人动脉血pH值为？",
    "options": [
      "A. 7.35-7.45",
      "B. 7.0-7.2",
      "C. 7.5-7.6",
      "D. 6.8-7.0"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉血正常pH为7.35-7.45。pH<7.35为酸中毒，>7.45为碱中毒。主要通过肺(呼吸调节CO₂)、肾(调节HCO₃⁻)和缓冲系统(碳酸氢盐/蛋白质/磷酸盐)维持。",
    "textbookReference": "《生理学》第9版 P235",
    "knowledgePoint": "酸碱平衡",
    "tags": [
      "pH",
      "酸碱平衡"
    ]
  },
  {
    "id": "physiology-legendary-001",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "legendary",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 5,
    "cardEffect": "造成17点伤害",
    "question": "肺活量(VC)等于？",
    "options": [
      "A. 潮气量 + 补吸气量 + 补呼气量",
      "B. 残气量 + 潮气量",
      "C. 最大通气量",
      "D. 功能残气量 + 潮气量"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "VC = TV + IRV + ERV，反映一次呼吸的最大通气能力。FVC(用力肺活量)和FEV₁(第一秒用力呼气容积)用于判断阻塞性/限制性通气障碍。",
    "textbookReference": "《生理学》第9版 P148",
    "knowledgePoint": "肺容量",
    "tags": [
      "VC",
      "肺功能"
    ]
  },
  {
    "id": "physiology-legendary-002",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 8,
    "cardEffect": "造成21点伤害",
    "question": "关于兴奋-收缩耦联的关键离子是？",
    "options": [
      "A. Ca²⁺",
      "B. Na⁺",
      "C. K⁺",
      "D. Cl⁻"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "骨骼肌兴奋-收缩耦联:动作电位沿T管传导→激活DHPR(L型Ca²⁺通道)→构象变化→直接激活RyR1(骨骼肌)或通过Ca²⁺内流激活RyR2(心肌)→Ca²⁺释放→肌钙蛋白→收缩。",
    "textbookReference": "《生理学》第9版 P45",
    "knowledgePoint": "兴奋-收缩耦联",
    "tags": [
      "Ca²⁺",
      "肌肉收缩"
    ]
  },
  {
    "id": "physiology-legendary-003",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "legendary",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 5,
    "cardEffect": "造成18点伤害",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-legendary-004",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学知识打击",
    "energyCost": 6,
    "cardEffect": "造成17点伤害",
    "question": "心输出量(CO)等于？",
    "options": [
      "A. 每搏输出量 × 心率",
      "B. 收缩压 - 舒张压",
      "C. 肺活量 × 呼吸频率",
      "D. 肾小球滤过率 × 时间"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "CO = SV × HR，正常成人静息时约5-6L/min。心指数(CI)=CO/体表面积，正常约3.0-3.5L/(min·m²)。",
    "textbookReference": "《生理学》第9版 P78",
    "knowledgePoint": "心输出量",
    "tags": [
      "CO",
      "心功能"
    ]
  },
  {
    "id": "physiology-legendary-005",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "生理学考题冲击",
    "energyCost": 6,
    "cardEffect": "造成22点伤害",
    "question": "体温调节中枢位于？",
    "options": [
      "A. 下丘脑视前区(PO/AH)",
      "B. 延髓",
      "C. 小脑",
      "D. 脊髓"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "PO/AH(视前区-下丘脑前部)含热敏神经元和冷敏神经元，是体温调节的整合中枢，通过散热和产热机制维持体温恒定。",
    "textbookReference": "《生理学》第9版 P220",
    "knowledgePoint": "体温调节",
    "tags": [
      "下丘脑",
      "体温"
    ]
  },
  {
    "id": "physiology-legendary-006",
    "subject": "生理学",
    "subjectId": "physiology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "生理学知识护盾",
    "energyCost": 5,
    "cardEffect": "获得23点护盾",
    "question": "糖皮质激素(皮质醇)的分泌主要受什么调控？",
    "options": [
      "A. 下丘脑-垂体-肾上腺轴(CRH→ACTH→皮质醇)",
      "B. 血糖直接调控",
      "C. 肾素-血管紧张素系统",
      "D. 甲状旁腺激素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "HPA轴:下丘脑室旁核分泌CRH→垂体前叶分泌ACTH→肾上腺皮质束状带分泌皮质醇。皮质醇有昼夜节律(早晨高/夜间低)和负反馈抑制。应激时激活。",
    "textbookReference": "《生理学》第9版 P390",
    "knowledgePoint": "肾上腺皮质激素",
    "tags": [
      "皮质醇",
      "HPA轴"
    ]
  }
];
})();
