/**
 * 病理学 题目集 — 120题
 * 难度分布: common(60) / rare(36) / epic(18) / legendary(6)
 */
(function() {
  var MediCard = window.MediCard || {};
  MediCard.QuestionBank = MediCard.QuestionBank || {};
  MediCard.QuestionBank['pathology'] = [
  {
    "id": "pathology-common-001",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "肉芽组织(granulation tissue)的主要成分是？",
    "options": [
      "A. 新生毛细血管和成纤维细胞",
      "B. 成熟胶原纤维",
      "C. 软骨细胞",
      "D. 脂肪细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肉芽组织由新生毛细血管(垂直生长)、成纤维细胞和炎细胞组成，是组织修复的重要阶段。最终演变为瘢痕组织。",
    "textbookReference": "《病理学》第9版 P35",
    "knowledgePoint": "肉芽组织",
    "tags": [
      "肉芽组织",
      "修复"
    ]
  },
  {
    "id": "pathology-common-002",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-common-003",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "快速进行性肾小球肾炎(RPGN)的特征性病理改变是？",
    "options": [
      "A. 新月体形成",
      "B. 系膜增生",
      "C. 基底膜增厚",
      "D. 肾小管坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "RPGN(新月体性肾炎)特征为肾小球囊壁层上皮细胞增生形成新月体(>50%肾小球)，预后极差。I型抗GBM/II型免疫复合物/III型ANCA相关。",
    "textbookReference": "《病理学》第9版 P345",
    "knowledgePoint": "RPGN",
    "tags": [
      "新月体",
      "肾炎"
    ]
  },
  {
    "id": "pathology-common-004",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "special",
    "cardName": "病理学综合技能",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "结核结节的特征性细胞是？",
    "options": [
      "A. 朗汉斯巨细胞和类上皮细胞",
      "B. 中性粒细胞",
      "C. 嗜酸性粒细胞",
      "D. 肥大细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "结核结节(肉芽肿)由类上皮细胞、朗汉斯多核巨细胞、淋巴细胞和成纤维细胞组成，中央可有干酪样坏死。",
    "textbookReference": "《病理学》第9版 P380",
    "knowledgePoint": "结核病理",
    "tags": [
      "结核",
      "肉芽肿"
    ]
  },
  {
    "id": "pathology-common-005",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "下列哪种肿瘤是恶性肿瘤？",
    "options": [
      "A. 精原细胞瘤",
      "B. 脂肪瘤",
      "C. 血管瘤",
      "D. 软骨瘤"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "精原细胞瘤是睾丸的恶性肿瘤(尽管名称以'瘤'结尾)。脂肪瘤、血管瘤、软骨瘤均为良性肿瘤。",
    "textbookReference": "《病理学》第9版 P110",
    "knowledgePoint": "肿瘤命名",
    "tags": [
      "恶性肿瘤",
      "命名"
    ]
  },
  {
    "id": "pathology-common-006",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 2,
    "cardEffect": "恢复3点HP",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-common-007",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成3点伤害",
    "question": "凋亡(apoptosis)的形态学特征不包括？",
    "options": [
      "A. 细胞膜破裂和炎症反应",
      "B. 细胞皱缩",
      "C. 染色质边集",
      "D. 凋亡小体形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "凋亡是程序性细胞死亡，特征为细胞皱缩、染色质凝聚和边集、凋亡小体形成，不引起炎症反应。细胞膜破裂和炎症见于坏死。",
    "textbookReference": "《病理学》第9版 P25",
    "knowledgePoint": "凋亡形态学",
    "tags": [
      "凋亡",
      "坏死"
    ]
  },
  {
    "id": "pathology-common-008",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "慢性胃炎最常见的病因是？",
    "options": [
      "A. 幽门螺杆菌(Hp)感染",
      "B. 自身免疫",
      "C. 药物",
      "D. 酒精"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "幽门螺杆菌感染是慢性胃炎最常见的病因(约90%)，Hp定植于胃黏膜分泌尿素酶、VacA/CagA等毒力因子。",
    "textbookReference": "《病理学》第9版 P195",
    "knowledgePoint": "慢性胃炎",
    "tags": [
      "Hp",
      "慢性胃炎"
    ]
  },
  {
    "id": "pathology-common-009",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "下列哪种肝硬化与乙型肝炎病毒感染关系最密切？",
    "options": [
      "A. 大结节性肝硬化",
      "B. 小结节性肝硬化",
      "C. 胆汁性肝硬化",
      "D. 淤血性肝硬化"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "乙肝后肝硬化以大结节性为主(结节>3mm)，酒精性肝硬化以小结节性为主(结节<3mm)。",
    "textbookReference": "《病理学》第9版 P212",
    "knowledgePoint": "肝硬化分型",
    "tags": [
      "肝硬化",
      "HBV"
    ]
  },
  {
    "id": "pathology-common-010",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "肉芽组织(granulation tissue)的主要成分是？",
    "options": [
      "A. 新生毛细血管和成纤维细胞",
      "B. 成熟胶原纤维",
      "C. 软骨细胞",
      "D. 脂肪细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肉芽组织由新生毛细血管(垂直生长)、成纤维细胞和炎细胞组成，是组织修复的重要阶段。最终演变为瘢痕组织。",
    "textbookReference": "《病理学》第9版 P35",
    "knowledgePoint": "肉芽组织",
    "tags": [
      "肉芽组织",
      "修复"
    ]
  },
  {
    "id": "pathology-common-011",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "下列哪种肿瘤是恶性肿瘤？",
    "options": [
      "A. 精原细胞瘤",
      "B. 脂肪瘤",
      "C. 血管瘤",
      "D. 软骨瘤"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "精原细胞瘤是睾丸的恶性肿瘤(尽管名称以'瘤'结尾)。脂肪瘤、血管瘤、软骨瘤均为良性肿瘤。",
    "textbookReference": "《病理学》第9版 P110",
    "knowledgePoint": "肿瘤命名",
    "tags": [
      "恶性肿瘤",
      "命名"
    ]
  },
  {
    "id": "pathology-common-012",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-common-013",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-common-014",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-common-015",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "凋亡(apoptosis)的形态学特征不包括？",
    "options": [
      "A. 细胞膜破裂和炎症反应",
      "B. 细胞皱缩",
      "C. 染色质边集",
      "D. 凋亡小体形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "凋亡是程序性细胞死亡，特征为细胞皱缩、染色质凝聚和边集、凋亡小体形成，不引起炎症反应。细胞膜破裂和炎症见于坏死。",
    "textbookReference": "《病理学》第9版 P25",
    "knowledgePoint": "凋亡形态学",
    "tags": [
      "凋亡",
      "坏死"
    ]
  },
  {
    "id": "pathology-common-016",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "良性肿瘤与恶性肿瘤最主要的区别是？",
    "options": [
      "A. 有无转移",
      "B. 肿瘤大小",
      "C. 生长速度",
      "D. 有无包膜"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "转移是恶性肿瘤最可靠的标志，良性肿瘤不发生转移。",
    "textbookReference": "《病理学》第9版 P105",
    "knowledgePoint": "肿瘤良恶性",
    "tags": [
      "肿瘤",
      "转移"
    ]
  },
  {
    "id": "pathology-common-017",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "肺淤血(褐色硬化)时，肺泡腔内出现哪种特征性细胞？",
    "options": [
      "A. 心力衰竭细胞(含铁血黄素巨噬细胞)",
      "B. 中性粒细胞",
      "C. 淋巴细胞",
      "D. 泡沫细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "慢性肺淤血时，肺泡腔内红细胞漏出并被巨噬细胞吞噬，血红蛋白分解为含铁血黄素，巨噬细胞变为「心力衰竭细胞」。",
    "textbookReference": "《病理学》第9版 P45",
    "knowledgePoint": "肺淤血",
    "tags": [
      "心力衰竭细胞",
      "淤血"
    ]
  },
  {
    "id": "pathology-common-018",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 2,
    "cardEffect": "恢复3点HP",
    "question": "慢性胃炎最常见的病因是？",
    "options": [
      "A. 幽门螺杆菌(Hp)感染",
      "B. 自身免疫",
      "C. 药物",
      "D. 酒精"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "幽门螺杆菌感染是慢性胃炎最常见的病因(约90%)，Hp定植于胃黏膜分泌尿素酶、VacA/CagA等毒力因子。",
    "textbookReference": "《病理学》第9版 P195",
    "knowledgePoint": "慢性胃炎",
    "tags": [
      "Hp",
      "慢性胃炎"
    ]
  },
  {
    "id": "pathology-common-019",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 2,
    "cardEffect": "获得4点护盾",
    "question": "快速进行性肾小球肾炎(RPGN)的特征性病理改变是？",
    "options": [
      "A. 新月体形成",
      "B. 系膜增生",
      "C. 基底膜增厚",
      "D. 肾小管坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "RPGN(新月体性肾炎)特征为肾小球囊壁层上皮细胞增生形成新月体(>50%肾小球)，预后极差。I型抗GBM/II型免疫复合物/III型ANCA相关。",
    "textbookReference": "《病理学》第9版 P345",
    "knowledgePoint": "RPGN",
    "tags": [
      "新月体",
      "肾炎"
    ]
  },
  {
    "id": "pathology-common-020",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "病理学综合技能",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-common-021",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "凋亡(apoptosis)的形态学特征不包括？",
    "options": [
      "A. 细胞膜破裂和炎症反应",
      "B. 细胞皱缩",
      "C. 染色质边集",
      "D. 凋亡小体形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "凋亡是程序性细胞死亡，特征为细胞皱缩、染色质凝聚和边集、凋亡小体形成，不引起炎症反应。细胞膜破裂和炎症见于坏死。",
    "textbookReference": "《病理学》第9版 P25",
    "knowledgePoint": "凋亡形态学",
    "tags": [
      "凋亡",
      "坏死"
    ]
  },
  {
    "id": "pathology-common-022",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "坏死的类型不包括以下哪项？",
    "options": [
      "A. 肥大",
      "B. 凝固性坏死",
      "C. 液化性坏死",
      "D. 干酪样坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肥大是细胞适应性反应(增大)而非坏死。坏死类型包括凝固性坏死、液化性坏死、干酪样坏死、脂肪坏死、纤维素样坏死等。",
    "textbookReference": "《病理学》第9版 P30",
    "knowledgePoint": "坏死类型",
    "tags": [
      "坏死",
      "适应性反应"
    ]
  },
  {
    "id": "pathology-common-023",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "坏死的类型不包括以下哪项？",
    "options": [
      "A. 肥大",
      "B. 凝固性坏死",
      "C. 液化性坏死",
      "D. 干酪样坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肥大是细胞适应性反应(增大)而非坏死。坏死类型包括凝固性坏死、液化性坏死、干酪样坏死、脂肪坏死、纤维素样坏死等。",
    "textbookReference": "《病理学》第9版 P30",
    "knowledgePoint": "坏死类型",
    "tags": [
      "坏死",
      "适应性反应"
    ]
  },
  {
    "id": "pathology-common-024",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 1,
    "cardEffect": "恢复4点HP",
    "question": "关于炎症的基本病理变化，下列哪项描述是正确的？",
    "options": [
      "A. 变质、渗出、增生",
      "B. 仅充血水肿",
      "C. 仅白细胞浸润",
      "D. 仅纤维组织增生"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "炎症的基本病理变化包括变质(变性坏死)、渗出(血管反应和白细胞渗出)和增生(实质细胞和间质细胞增生)。",
    "textbookReference": "《病理学》第9版 P65",
    "knowledgePoint": "炎症基本病变",
    "tags": [
      "炎症",
      "病理"
    ]
  },
  {
    "id": "pathology-common-025",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "良性肿瘤与恶性肿瘤最主要的区别是？",
    "options": [
      "A. 有无转移",
      "B. 肿瘤大小",
      "C. 生长速度",
      "D. 有无包膜"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "转移是恶性肿瘤最可靠的标志，良性肿瘤不发生转移。",
    "textbookReference": "《病理学》第9版 P105",
    "knowledgePoint": "肿瘤良恶性",
    "tags": [
      "肿瘤",
      "转移"
    ]
  },
  {
    "id": "pathology-common-026",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "关于炎症的基本病理变化，下列哪项描述是正确的？",
    "options": [
      "A. 变质、渗出、增生",
      "B. 仅充血水肿",
      "C. 仅白细胞浸润",
      "D. 仅纤维组织增生"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "炎症的基本病理变化包括变质(变性坏死)、渗出(血管反应和白细胞渗出)和增生(实质细胞和间质细胞增生)。",
    "textbookReference": "《病理学》第9版 P65",
    "knowledgePoint": "炎症基本病变",
    "tags": [
      "炎症",
      "病理"
    ]
  },
  {
    "id": "pathology-common-027",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-common-028",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 1,
    "cardEffect": "恢复2点HP",
    "question": "下列哪种肿瘤是恶性肿瘤？",
    "options": [
      "A. 精原细胞瘤",
      "B. 脂肪瘤",
      "C. 血管瘤",
      "D. 软骨瘤"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "精原细胞瘤是睾丸的恶性肿瘤(尽管名称以'瘤'结尾)。脂肪瘤、血管瘤、软骨瘤均为良性肿瘤。",
    "textbookReference": "《病理学》第9版 P110",
    "knowledgePoint": "肿瘤命名",
    "tags": [
      "恶性肿瘤",
      "命名"
    ]
  },
  {
    "id": "pathology-common-029",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 1,
    "cardEffect": "恢复4点HP",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-common-030",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-common-031",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "heal",
    "cardName": "病理学复习修复",
    "energyCost": 2,
    "cardEffect": "恢复2点HP",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-common-032",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "坏死的类型不包括以下哪项？",
    "options": [
      "A. 肥大",
      "B. 凝固性坏死",
      "C. 液化性坏死",
      "D. 干酪样坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肥大是细胞适应性反应(增大)而非坏死。坏死类型包括凝固性坏死、液化性坏死、干酪样坏死、脂肪坏死、纤维素样坏死等。",
    "textbookReference": "《病理学》第9版 P30",
    "knowledgePoint": "坏死类型",
    "tags": [
      "坏死",
      "适应性反应"
    ]
  },
  {
    "id": "pathology-common-033",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 1,
    "cardEffect": "恢复2点HP",
    "question": "结核结节的特征性细胞是？",
    "options": [
      "A. 朗汉斯巨细胞和类上皮细胞",
      "B. 中性粒细胞",
      "C. 嗜酸性粒细胞",
      "D. 肥大细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "结核结节(肉芽肿)由类上皮细胞、朗汉斯多核巨细胞、淋巴细胞和成纤维细胞组成，中央可有干酪样坏死。",
    "textbookReference": "《病理学》第9版 P380",
    "knowledgePoint": "结核病理",
    "tags": [
      "结核",
      "肉芽肿"
    ]
  },
  {
    "id": "pathology-common-034",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识巩固治疗",
    "energyCost": 2,
    "cardEffect": "恢复2点HP",
    "question": "良性肿瘤与恶性肿瘤最主要的区别是？",
    "options": [
      "A. 有无转移",
      "B. 肿瘤大小",
      "C. 生长速度",
      "D. 有无包膜"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "转移是恶性肿瘤最可靠的标志，良性肿瘤不发生转移。",
    "textbookReference": "《病理学》第9版 P105",
    "knowledgePoint": "肿瘤良恶性",
    "tags": [
      "肿瘤",
      "转移"
    ]
  },
  {
    "id": "pathology-common-035",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 2,
    "cardEffect": "获得2点护盾",
    "question": "风湿病最有诊断意义的病变是？",
    "options": [
      "A. 风湿小体(Aschoff body)",
      "B. 关节红肿",
      "C. 发热",
      "D. 皮下结节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "Aschoff小体(风湿小体)是风湿病的特征性病变，由纤维素样坏死、Aschoff细胞(Anitschkow细胞)、淋巴细胞组成。",
    "textbookReference": "《病理学》第9版 P175",
    "knowledgePoint": "风湿病",
    "tags": [
      "Aschoff小体",
      "风湿"
    ]
  },
  {
    "id": "pathology-common-036",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "关于炎症的基本病理变化，下列哪项描述是正确的？",
    "options": [
      "A. 变质、渗出、增生",
      "B. 仅充血水肿",
      "C. 仅白细胞浸润",
      "D. 仅纤维组织增生"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "炎症的基本病理变化包括变质(变性坏死)、渗出(血管反应和白细胞渗出)和增生(实质细胞和间质细胞增生)。",
    "textbookReference": "《病理学》第9版 P65",
    "knowledgePoint": "炎症基本病变",
    "tags": [
      "炎症",
      "病理"
    ]
  },
  {
    "id": "pathology-common-037",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-common-038",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 2,
    "cardEffect": "恢复4点HP",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-common-039",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-common-040",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-common-041",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识巩固治疗",
    "energyCost": 1,
    "cardEffect": "恢复3点HP",
    "question": "良性肿瘤与恶性肿瘤最主要的区别是？",
    "options": [
      "A. 有无转移",
      "B. 肿瘤大小",
      "C. 生长速度",
      "D. 有无包膜"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "转移是恶性肿瘤最可靠的标志，良性肿瘤不发生转移。",
    "textbookReference": "《病理学》第9版 P105",
    "knowledgePoint": "肿瘤良恶性",
    "tags": [
      "肿瘤",
      "转移"
    ]
  },
  {
    "id": "pathology-common-042",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-common-043",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "风湿病最有诊断意义的病变是？",
    "options": [
      "A. 风湿小体(Aschoff body)",
      "B. 关节红肿",
      "C. 发热",
      "D. 皮下结节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "Aschoff小体(风湿小体)是风湿病的特征性病变，由纤维素样坏死、Aschoff细胞(Anitschkow细胞)、淋巴细胞组成。",
    "textbookReference": "《病理学》第9版 P175",
    "knowledgePoint": "风湿病",
    "tags": [
      "Aschoff小体",
      "风湿"
    ]
  },
  {
    "id": "pathology-common-044",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-common-045",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 2,
    "cardEffect": "获得4点护盾",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-common-046",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-common-047",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "病理学综合技能",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "凋亡(apoptosis)的形态学特征不包括？",
    "options": [
      "A. 细胞膜破裂和炎症反应",
      "B. 细胞皱缩",
      "C. 染色质边集",
      "D. 凋亡小体形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "凋亡是程序性细胞死亡，特征为细胞皱缩、染色质凝聚和边集、凋亡小体形成，不引起炎症反应。细胞膜破裂和炎症见于坏死。",
    "textbookReference": "《病理学》第9版 P25",
    "knowledgePoint": "凋亡形态学",
    "tags": [
      "凋亡",
      "坏死"
    ]
  },
  {
    "id": "pathology-common-048",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 2,
    "cardEffect": "获得4点护盾",
    "question": "肉芽组织(granulation tissue)的主要成分是？",
    "options": [
      "A. 新生毛细血管和成纤维细胞",
      "B. 成熟胶原纤维",
      "C. 软骨细胞",
      "D. 脂肪细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肉芽组织由新生毛细血管(垂直生长)、成纤维细胞和炎细胞组成，是组织修复的重要阶段。最终演变为瘢痕组织。",
    "textbookReference": "《病理学》第9版 P35",
    "knowledgePoint": "肉芽组织",
    "tags": [
      "肉芽组织",
      "修复"
    ]
  },
  {
    "id": "pathology-common-049",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 2,
    "cardEffect": "恢复2点HP",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-common-050",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "动脉粥样硬化最早期的病变是？",
    "options": [
      "A. 脂纹(fatty streak)",
      "B. 纤维斑块",
      "C. 粥样斑块",
      "D. 血栓形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉粥样硬化最早期病变为脂纹，由泡沫细胞(巨噬细胞吞噬oxLDL)在内膜下聚集形成。",
    "textbookReference": "《病理学》第9版 P155",
    "knowledgePoint": "动脉粥样硬化",
    "tags": [
      "脂纹",
      "AS"
    ]
  },
  {
    "id": "pathology-common-051",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "结核结节的特征性细胞是？",
    "options": [
      "A. 朗汉斯巨细胞和类上皮细胞",
      "B. 中性粒细胞",
      "C. 嗜酸性粒细胞",
      "D. 肥大细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "结核结节(肉芽肿)由类上皮细胞、朗汉斯多核巨细胞、淋巴细胞和成纤维细胞组成，中央可有干酪样坏死。",
    "textbookReference": "《病理学》第9版 P380",
    "knowledgePoint": "结核病理",
    "tags": [
      "结核",
      "肉芽肿"
    ]
  },
  {
    "id": "pathology-common-052",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 1,
    "cardEffect": "获得3点护盾",
    "question": "原位癌(CIS)是指？",
    "options": [
      "A. 癌细胞局限于上皮层内未突破基底膜",
      "B. 癌组织浸润深度<5mm",
      "C. 仅有淋巴管浸润",
      "D. 远处转移"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原位癌指异型增生的细胞累及上皮全层但未突破基底膜，不发生转移。早期发现和治疗可完全治愈。",
    "textbookReference": "《病理学》第9版 P115",
    "knowledgePoint": "原位癌",
    "tags": [
      "原位癌",
      "基底膜"
    ]
  },
  {
    "id": "pathology-common-053",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成2点伤害",
    "question": "肉芽组织(granulation tissue)的主要成分是？",
    "options": [
      "A. 新生毛细血管和成纤维细胞",
      "B. 成熟胶原纤维",
      "C. 软骨细胞",
      "D. 脂肪细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肉芽组织由新生毛细血管(垂直生长)、成纤维细胞和炎细胞组成，是组织修复的重要阶段。最终演变为瘢痕组织。",
    "textbookReference": "《病理学》第9版 P35",
    "knowledgePoint": "肉芽组织",
    "tags": [
      "肉芽组织",
      "修复"
    ]
  },
  {
    "id": "pathology-common-054",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "肝硬化假小叶的特征不包括？",
    "options": [
      "A. 中央静脉位于小叶中央",
      "B. 纤维组织增生包绕肝细胞团",
      "C. 肝细胞排列紊乱",
      "D. 中央静脉缺如或偏位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "假小叶的中央静脉缺如、偏位或多个，肝细胞索排列紊乱，周围有纤维间隔包绕。正常肝小叶中央静脉位于中央。",
    "textbookReference": "《病理学》第9版 P210",
    "knowledgePoint": "肝硬化",
    "tags": [
      "假小叶",
      "肝硬化"
    ]
  },
  {
    "id": "pathology-common-055",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 1,
    "cardEffect": "获得4点护盾",
    "question": "关于炎症的基本病理变化，下列哪项描述是正确的？",
    "options": [
      "A. 变质、渗出、增生",
      "B. 仅充血水肿",
      "C. 仅白细胞浸润",
      "D. 仅纤维组织增生"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "炎症的基本病理变化包括变质(变性坏死)、渗出(血管反应和白细胞渗出)和增生(实质细胞和间质细胞增生)。",
    "textbookReference": "《病理学》第9版 P65",
    "knowledgePoint": "炎症基本病变",
    "tags": [
      "炎症",
      "病理"
    ]
  },
  {
    "id": "pathology-common-056",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 1,
    "cardEffect": "造成2点伤害",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-common-057",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 1,
    "cardEffect": "造成4点伤害",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-common-058",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 1,
    "cardEffect": "造成3点伤害",
    "question": "风湿病最有诊断意义的病变是？",
    "options": [
      "A. 风湿小体(Aschoff body)",
      "B. 关节红肿",
      "C. 发热",
      "D. 皮下结节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "Aschoff小体(风湿小体)是风湿病的特征性病变，由纤维素样坏死、Aschoff细胞(Anitschkow细胞)、淋巴细胞组成。",
    "textbookReference": "《病理学》第9版 P175",
    "knowledgePoint": "风湿病",
    "tags": [
      "Aschoff小体",
      "风湿"
    ]
  },
  {
    "id": "pathology-common-059",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 2,
    "cardEffect": "造成4点伤害",
    "question": "肉芽组织(granulation tissue)的主要成分是？",
    "options": [
      "A. 新生毛细血管和成纤维细胞",
      "B. 成熟胶原纤维",
      "C. 软骨细胞",
      "D. 脂肪细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肉芽组织由新生毛细血管(垂直生长)、成纤维细胞和炎细胞组成，是组织修复的重要阶段。最终演变为瘢痕组织。",
    "textbookReference": "《病理学》第9版 P35",
    "knowledgePoint": "肉芽组织",
    "tags": [
      "肉芽组织",
      "修复"
    ]
  },
  {
    "id": "pathology-common-060",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "common",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 1,
    "cardEffect": "恢复2点HP",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-rare-001",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-rare-002",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 3,
    "cardEffect": "恢复4点HP",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-rare-003",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 3,
    "cardEffect": "获得4点护盾",
    "question": "关于炎症的基本病理变化，下列哪项描述是正确的？",
    "options": [
      "A. 变质、渗出、增生",
      "B. 仅充血水肿",
      "C. 仅白细胞浸润",
      "D. 仅纤维组织增生"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "炎症的基本病理变化包括变质(变性坏死)、渗出(血管反应和白细胞渗出)和增生(实质细胞和间质细胞增生)。",
    "textbookReference": "《病理学》第9版 P65",
    "knowledgePoint": "炎症基本病变",
    "tags": [
      "炎症",
      "病理"
    ]
  },
  {
    "id": "pathology-rare-004",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 3,
    "cardEffect": "获得8点护盾",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-rare-005",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成7点伤害",
    "question": "风湿病最有诊断意义的病变是？",
    "options": [
      "A. 风湿小体(Aschoff body)",
      "B. 关节红肿",
      "C. 发热",
      "D. 皮下结节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "Aschoff小体(风湿小体)是风湿病的特征性病变，由纤维素样坏死、Aschoff细胞(Anitschkow细胞)、淋巴细胞组成。",
    "textbookReference": "《病理学》第9版 P175",
    "knowledgePoint": "风湿病",
    "tags": [
      "Aschoff小体",
      "风湿"
    ]
  },
  {
    "id": "pathology-rare-006",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-rare-007",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "肺淤血(褐色硬化)时，肺泡腔内出现哪种特征性细胞？",
    "options": [
      "A. 心力衰竭细胞(含铁血黄素巨噬细胞)",
      "B. 中性粒细胞",
      "C. 淋巴细胞",
      "D. 泡沫细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "慢性肺淤血时，肺泡腔内红细胞漏出并被巨噬细胞吞噬，血红蛋白分解为含铁血黄素，巨噬细胞变为「心力衰竭细胞」。",
    "textbookReference": "《病理学》第9版 P45",
    "knowledgePoint": "肺淤血",
    "tags": [
      "心力衰竭细胞",
      "淤血"
    ]
  },
  {
    "id": "pathology-rare-008",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "临床经验屏障",
    "energyCost": 2,
    "cardEffect": "获得5点护盾",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-rare-009",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 3,
    "cardEffect": "获得8点护盾",
    "question": "下列哪种肝硬化与乙型肝炎病毒感染关系最密切？",
    "options": [
      "A. 大结节性肝硬化",
      "B. 小结节性肝硬化",
      "C. 胆汁性肝硬化",
      "D. 淤血性肝硬化"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "乙肝后肝硬化以大结节性为主(结节>3mm)，酒精性肝硬化以小结节性为主(结节<3mm)。",
    "textbookReference": "《病理学》第9版 P212",
    "knowledgePoint": "肝硬化分型",
    "tags": [
      "肝硬化",
      "HBV"
    ]
  },
  {
    "id": "pathology-rare-010",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 2,
    "cardEffect": "获得5点护盾",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-rare-011",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "凋亡(apoptosis)的形态学特征不包括？",
    "options": [
      "A. 细胞膜破裂和炎症反应",
      "B. 细胞皱缩",
      "C. 染色质边集",
      "D. 凋亡小体形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "凋亡是程序性细胞死亡，特征为细胞皱缩、染色质凝聚和边集、凋亡小体形成，不引起炎症反应。细胞膜破裂和炎症见于坏死。",
    "textbookReference": "《病理学》第9版 P25",
    "knowledgePoint": "凋亡形态学",
    "tags": [
      "凋亡",
      "坏死"
    ]
  },
  {
    "id": "pathology-rare-012",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 2,
    "cardEffect": "造成5点伤害",
    "question": "结核结节的特征性细胞是？",
    "options": [
      "A. 朗汉斯巨细胞和类上皮细胞",
      "B. 中性粒细胞",
      "C. 嗜酸性粒细胞",
      "D. 肥大细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "结核结节(肉芽肿)由类上皮细胞、朗汉斯多核巨细胞、淋巴细胞和成纤维细胞组成，中央可有干酪样坏死。",
    "textbookReference": "《病理学》第9版 P380",
    "knowledgePoint": "结核病理",
    "tags": [
      "结核",
      "肉芽肿"
    ]
  },
  {
    "id": "pathology-rare-013",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "结核结节的特征性细胞是？",
    "options": [
      "A. 朗汉斯巨细胞和类上皮细胞",
      "B. 中性粒细胞",
      "C. 嗜酸性粒细胞",
      "D. 肥大细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "结核结节(肉芽肿)由类上皮细胞、朗汉斯多核巨细胞、淋巴细胞和成纤维细胞组成，中央可有干酪样坏死。",
    "textbookReference": "《病理学》第9版 P380",
    "knowledgePoint": "结核病理",
    "tags": [
      "结核",
      "肉芽肿"
    ]
  },
  {
    "id": "pathology-rare-014",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 3,
    "cardEffect": "造成6点伤害",
    "question": "动脉粥样硬化最早期的病变是？",
    "options": [
      "A. 脂纹(fatty streak)",
      "B. 纤维斑块",
      "C. 粥样斑块",
      "D. 血栓形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉粥样硬化最早期病变为脂纹，由泡沫细胞(巨噬细胞吞噬oxLDL)在内膜下聚集形成。",
    "textbookReference": "《病理学》第9版 P155",
    "knowledgePoint": "动脉粥样硬化",
    "tags": [
      "脂纹",
      "AS"
    ]
  },
  {
    "id": "pathology-rare-015",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 2,
    "cardEffect": "获得7点护盾",
    "question": "风湿病最有诊断意义的病变是？",
    "options": [
      "A. 风湿小体(Aschoff body)",
      "B. 关节红肿",
      "C. 发热",
      "D. 皮下结节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "Aschoff小体(风湿小体)是风湿病的特征性病变，由纤维素样坏死、Aschoff细胞(Anitschkow细胞)、淋巴细胞组成。",
    "textbookReference": "《病理学》第9版 P175",
    "knowledgePoint": "风湿病",
    "tags": [
      "Aschoff小体",
      "风湿"
    ]
  },
  {
    "id": "pathology-rare-016",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "慢性胃炎最常见的病因是？",
    "options": [
      "A. 幽门螺杆菌(Hp)感染",
      "B. 自身免疫",
      "C. 药物",
      "D. 酒精"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "幽门螺杆菌感染是慢性胃炎最常见的病因(约90%)，Hp定植于胃黏膜分泌尿素酶、VacA/CagA等毒力因子。",
    "textbookReference": "《病理学》第9版 P195",
    "knowledgePoint": "慢性胃炎",
    "tags": [
      "Hp",
      "慢性胃炎"
    ]
  },
  {
    "id": "pathology-rare-017",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 3,
    "cardEffect": "获得7点护盾",
    "question": "良性肿瘤与恶性肿瘤最主要的区别是？",
    "options": [
      "A. 有无转移",
      "B. 肿瘤大小",
      "C. 生长速度",
      "D. 有无包膜"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "转移是恶性肿瘤最可靠的标志，良性肿瘤不发生转移。",
    "textbookReference": "《病理学》第9版 P105",
    "knowledgePoint": "肿瘤良恶性",
    "tags": [
      "肿瘤",
      "转移"
    ]
  },
  {
    "id": "pathology-rare-018",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 2,
    "cardEffect": "造成7点伤害",
    "question": "坏死的类型不包括以下哪项？",
    "options": [
      "A. 肥大",
      "B. 凝固性坏死",
      "C. 液化性坏死",
      "D. 干酪样坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肥大是细胞适应性反应(增大)而非坏死。坏死类型包括凝固性坏死、液化性坏死、干酪样坏死、脂肪坏死、纤维素样坏死等。",
    "textbookReference": "《病理学》第9版 P30",
    "knowledgePoint": "坏死类型",
    "tags": [
      "坏死",
      "适应性反应"
    ]
  },
  {
    "id": "pathology-rare-019",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "凋亡(apoptosis)的形态学特征不包括？",
    "options": [
      "A. 细胞膜破裂和炎症反应",
      "B. 细胞皱缩",
      "C. 染色质边集",
      "D. 凋亡小体形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "凋亡是程序性细胞死亡，特征为细胞皱缩、染色质凝聚和边集、凋亡小体形成，不引起炎症反应。细胞膜破裂和炎症见于坏死。",
    "textbookReference": "《病理学》第9版 P25",
    "knowledgePoint": "凋亡形态学",
    "tags": [
      "凋亡",
      "坏死"
    ]
  },
  {
    "id": "pathology-rare-020",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 3,
    "cardEffect": "造成4点伤害",
    "question": "关于炎症的基本病理变化，下列哪项描述是正确的？",
    "options": [
      "A. 变质、渗出、增生",
      "B. 仅充血水肿",
      "C. 仅白细胞浸润",
      "D. 仅纤维组织增生"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "炎症的基本病理变化包括变质(变性坏死)、渗出(血管反应和白细胞渗出)和增生(实质细胞和间质细胞增生)。",
    "textbookReference": "《病理学》第9版 P65",
    "knowledgePoint": "炎症基本病变",
    "tags": [
      "炎症",
      "病理"
    ]
  },
  {
    "id": "pathology-rare-021",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 3,
    "cardEffect": "造成6点伤害",
    "question": "下列哪种肝硬化与乙型肝炎病毒感染关系最密切？",
    "options": [
      "A. 大结节性肝硬化",
      "B. 小结节性肝硬化",
      "C. 胆汁性肝硬化",
      "D. 淤血性肝硬化"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "乙肝后肝硬化以大结节性为主(结节>3mm)，酒精性肝硬化以小结节性为主(结节<3mm)。",
    "textbookReference": "《病理学》第9版 P212",
    "knowledgePoint": "肝硬化分型",
    "tags": [
      "肝硬化",
      "HBV"
    ]
  },
  {
    "id": "pathology-rare-022",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 3,
    "cardEffect": "造成7点伤害",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-rare-023",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 3,
    "cardEffect": "获得4点护盾",
    "question": "肝硬化假小叶的特征不包括？",
    "options": [
      "A. 中央静脉位于小叶中央",
      "B. 纤维组织增生包绕肝细胞团",
      "C. 肝细胞排列紊乱",
      "D. 中央静脉缺如或偏位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "假小叶的中央静脉缺如、偏位或多个，肝细胞索排列紊乱，周围有纤维间隔包绕。正常肝小叶中央静脉位于中央。",
    "textbookReference": "《病理学》第9版 P210",
    "knowledgePoint": "肝硬化",
    "tags": [
      "假小叶",
      "肝硬化"
    ]
  },
  {
    "id": "pathology-rare-024",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识巩固治疗",
    "energyCost": 2,
    "cardEffect": "恢复6点HP",
    "question": "关于炎症的基本病理变化，下列哪项描述是正确的？",
    "options": [
      "A. 变质、渗出、增生",
      "B. 仅充血水肿",
      "C. 仅白细胞浸润",
      "D. 仅纤维组织增生"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "炎症的基本病理变化包括变质(变性坏死)、渗出(血管反应和白细胞渗出)和增生(实质细胞和间质细胞增生)。",
    "textbookReference": "《病理学》第9版 P65",
    "knowledgePoint": "炎症基本病变",
    "tags": [
      "炎症",
      "病理"
    ]
  },
  {
    "id": "pathology-rare-025",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 3,
    "cardEffect": "造成4点伤害",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-rare-026",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "病理学精准攻击",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "肾病综合征的临床表现不包括？",
    "options": [
      "A. 高血压(必备条件)",
      "B. 大量蛋白尿(>3.5g/24h)",
      "C. 低白蛋白血症(<30g/L)",
      "D. 水肿和高脂血症"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肾病综合征的四联征:大量蛋白尿、低白蛋白血症、水肿和高脂血症。高血压不是肾病综合征必备条件(肾炎综合征常有)。",
    "textbookReference": "《病理学》第9版 P340",
    "knowledgePoint": "肾病综合征",
    "tags": [
      "肾小球疾病"
    ]
  },
  {
    "id": "pathology-rare-027",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 3,
    "cardEffect": "恢复4点HP",
    "question": "动脉粥样硬化最早期的病变是？",
    "options": [
      "A. 脂纹(fatty streak)",
      "B. 纤维斑块",
      "C. 粥样斑块",
      "D. 血栓形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉粥样硬化最早期病变为脂纹，由泡沫细胞(巨噬细胞吞噬oxLDL)在内膜下聚集形成。",
    "textbookReference": "《病理学》第9版 P155",
    "knowledgePoint": "动脉粥样硬化",
    "tags": [
      "脂纹",
      "AS"
    ]
  },
  {
    "id": "pathology-rare-028",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 3,
    "cardEffect": "造成8点伤害",
    "question": "动脉粥样硬化最早期的病变是？",
    "options": [
      "A. 脂纹(fatty streak)",
      "B. 纤维斑块",
      "C. 粥样斑块",
      "D. 血栓形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉粥样硬化最早期病变为脂纹，由泡沫细胞(巨噬细胞吞噬oxLDL)在内膜下聚集形成。",
    "textbookReference": "《病理学》第9版 P155",
    "knowledgePoint": "动脉粥样硬化",
    "tags": [
      "脂纹",
      "AS"
    ]
  },
  {
    "id": "pathology-rare-029",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 2,
    "cardEffect": "获得6点护盾",
    "question": "血栓形成的条件不包括？",
    "options": [
      "A. 血流加速",
      "B. 血管内皮损伤",
      "C. 血流缓慢",
      "D. 血液凝固性增高"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "血栓形成三要素(Virchow triad)：血管内皮损伤、血流状态改变(缓慢或涡流)、血液凝固性增高。血流加速实际上减少血栓形成风险。",
    "textbookReference": "《病理学》第9版 P50",
    "knowledgePoint": "血栓形成",
    "tags": [
      "血栓",
      "Virchow"
    ]
  },
  {
    "id": "pathology-rare-030",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 2,
    "cardEffect": "造成6点伤害",
    "question": "肺淤血(褐色硬化)时，肺泡腔内出现哪种特征性细胞？",
    "options": [
      "A. 心力衰竭细胞(含铁血黄素巨噬细胞)",
      "B. 中性粒细胞",
      "C. 淋巴细胞",
      "D. 泡沫细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "慢性肺淤血时，肺泡腔内红细胞漏出并被巨噬细胞吞噬，血红蛋白分解为含铁血黄素，巨噬细胞变为「心力衰竭细胞」。",
    "textbookReference": "《病理学》第9版 P45",
    "knowledgePoint": "肺淤血",
    "tags": [
      "心力衰竭细胞",
      "淤血"
    ]
  },
  {
    "id": "pathology-rare-031",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 2,
    "cardEffect": "造成5点伤害",
    "question": "下列哪种肝硬化与乙型肝炎病毒感染关系最密切？",
    "options": [
      "A. 大结节性肝硬化",
      "B. 小结节性肝硬化",
      "C. 胆汁性肝硬化",
      "D. 淤血性肝硬化"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "乙肝后肝硬化以大结节性为主(结节>3mm)，酒精性肝硬化以小结节性为主(结节<3mm)。",
    "textbookReference": "《病理学》第9版 P212",
    "knowledgePoint": "肝硬化分型",
    "tags": [
      "肝硬化",
      "HBV"
    ]
  },
  {
    "id": "pathology-rare-032",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 2,
    "cardEffect": "获得6点护盾",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-rare-033",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 3,
    "cardEffect": "获得5点护盾",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-rare-034",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 2,
    "cardEffect": "造成7点伤害",
    "question": "肺淤血(褐色硬化)时，肺泡腔内出现哪种特征性细胞？",
    "options": [
      "A. 心力衰竭细胞(含铁血黄素巨噬细胞)",
      "B. 中性粒细胞",
      "C. 淋巴细胞",
      "D. 泡沫细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "慢性肺淤血时，肺泡腔内红细胞漏出并被巨噬细胞吞噬，血红蛋白分解为含铁血黄素，巨噬细胞变为「心力衰竭细胞」。",
    "textbookReference": "《病理学》第9版 P45",
    "knowledgePoint": "肺淤血",
    "tags": [
      "心力衰竭细胞",
      "淤血"
    ]
  },
  {
    "id": "pathology-rare-035",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 3,
    "cardEffect": "造成5点伤害",
    "question": "慢性胃炎最常见的病因是？",
    "options": [
      "A. 幽门螺杆菌(Hp)感染",
      "B. 自身免疫",
      "C. 药物",
      "D. 酒精"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "幽门螺杆菌感染是慢性胃炎最常见的病因(约90%)，Hp定植于胃黏膜分泌尿素酶、VacA/CagA等毒力因子。",
    "textbookReference": "《病理学》第9版 P195",
    "knowledgePoint": "慢性胃炎",
    "tags": [
      "Hp",
      "慢性胃炎"
    ]
  },
  {
    "id": "pathology-rare-036",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "rare",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 3,
    "cardEffect": "造成6点伤害",
    "question": "肝硬化假小叶的特征不包括？",
    "options": [
      "A. 中央静脉位于小叶中央",
      "B. 纤维组织增生包绕肝细胞团",
      "C. 肝细胞排列紊乱",
      "D. 中央静脉缺如或偏位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "假小叶的中央静脉缺如、偏位或多个，肝细胞索排列紊乱，周围有纤维间隔包绕。正常肝小叶中央静脉位于中央。",
    "textbookReference": "《病理学》第9版 P210",
    "knowledgePoint": "肝硬化",
    "tags": [
      "假小叶",
      "肝硬化"
    ]
  },
  {
    "id": "pathology-epic-001",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 4,
    "cardEffect": "获得10点护盾",
    "question": "下列哪种肿瘤是恶性肿瘤？",
    "options": [
      "A. 精原细胞瘤",
      "B. 脂肪瘤",
      "C. 血管瘤",
      "D. 软骨瘤"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "精原细胞瘤是睾丸的恶性肿瘤(尽管名称以'瘤'结尾)。脂肪瘤、血管瘤、软骨瘤均为良性肿瘤。",
    "textbookReference": "《病理学》第9版 P110",
    "knowledgePoint": "肿瘤命名",
    "tags": [
      "恶性肿瘤",
      "命名"
    ]
  },
  {
    "id": "pathology-epic-002",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 4,
    "cardEffect": "获得10点护盾",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-epic-003",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "循证医学防护",
    "energyCost": 5,
    "cardEffect": "获得13点护盾",
    "question": "下列哪种肝硬化与乙型肝炎病毒感染关系最密切？",
    "options": [
      "A. 大结节性肝硬化",
      "B. 小结节性肝硬化",
      "C. 胆汁性肝硬化",
      "D. 淤血性肝硬化"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "乙肝后肝硬化以大结节性为主(结节>3mm)，酒精性肝硬化以小结节性为主(结节<3mm)。",
    "textbookReference": "《病理学》第9版 P212",
    "knowledgePoint": "肝硬化分型",
    "tags": [
      "肝硬化",
      "HBV"
    ]
  },
  {
    "id": "pathology-epic-004",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 4,
    "cardEffect": "造成12点伤害",
    "question": "肝硬化假小叶的特征不包括？",
    "options": [
      "A. 中央静脉位于小叶中央",
      "B. 纤维组织增生包绕肝细胞团",
      "C. 肝细胞排列紊乱",
      "D. 中央静脉缺如或偏位"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "假小叶的中央静脉缺如、偏位或多个，肝细胞索排列紊乱，周围有纤维间隔包绕。正常肝小叶中央静脉位于中央。",
    "textbookReference": "《病理学》第9版 P210",
    "knowledgePoint": "肝硬化",
    "tags": [
      "假小叶",
      "肝硬化"
    ]
  },
  {
    "id": "pathology-epic-005",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "truefalse",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 4,
    "cardEffect": "造成10点伤害",
    "question": "风湿病最有诊断意义的病变是？",
    "options": [
      "A. 风湿小体(Aschoff body)",
      "B. 关节红肿",
      "C. 发热",
      "D. 皮下结节"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "Aschoff小体(风湿小体)是风湿病的特征性病变，由纤维素样坏死、Aschoff细胞(Anitschkow细胞)、淋巴细胞组成。",
    "textbookReference": "《病理学》第9版 P175",
    "knowledgePoint": "风湿病",
    "tags": [
      "Aschoff小体",
      "风湿"
    ]
  },
  {
    "id": "pathology-epic-006",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 5,
    "cardEffect": "获得12点护盾",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-epic-007",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "truefalse",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 3,
    "cardEffect": "造成12点伤害",
    "question": "肉芽组织(granulation tissue)的主要成分是？",
    "options": [
      "A. 新生毛细血管和成纤维细胞",
      "B. 成熟胶原纤维",
      "C. 软骨细胞",
      "D. 脂肪细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肉芽组织由新生毛细血管(垂直生长)、成纤维细胞和炎细胞组成，是组织修复的重要阶段。最终演变为瘢痕组织。",
    "textbookReference": "《病理学》第9版 P35",
    "knowledgePoint": "肉芽组织",
    "tags": [
      "肉芽组织",
      "修复"
    ]
  },
  {
    "id": "pathology-epic-008",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 4,
    "cardEffect": "造成15点伤害",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-epic-009",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 5,
    "cardEffect": "获得8点护盾",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-epic-010",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "病理学复习修复",
    "energyCost": 4,
    "cardEffect": "恢复14点HP",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-epic-011",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "学习记忆恢复",
    "energyCost": 3,
    "cardEffect": "恢复11点HP",
    "question": "慢性胃炎最常见的病因是？",
    "options": [
      "A. 幽门螺杆菌(Hp)感染",
      "B. 自身免疫",
      "C. 药物",
      "D. 酒精"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "幽门螺杆菌感染是慢性胃炎最常见的病因(约90%)，Hp定植于胃黏膜分泌尿素酶、VacA/CagA等毒力因子。",
    "textbookReference": "《病理学》第9版 P195",
    "knowledgePoint": "慢性胃炎",
    "tags": [
      "Hp",
      "慢性胃炎"
    ]
  },
  {
    "id": "pathology-epic-012",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 5,
    "cardEffect": "恢复9点HP",
    "question": "慢性胃炎最常见的病因是？",
    "options": [
      "A. 幽门螺杆菌(Hp)感染",
      "B. 自身免疫",
      "C. 药物",
      "D. 酒精"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "幽门螺杆菌感染是慢性胃炎最常见的病因(约90%)，Hp定植于胃黏膜分泌尿素酶、VacA/CagA等毒力因子。",
    "textbookReference": "《病理学》第9版 P195",
    "knowledgePoint": "慢性胃炎",
    "tags": [
      "Hp",
      "慢性胃炎"
    ]
  },
  {
    "id": "pathology-epic-013",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学知识打击",
    "energyCost": 3,
    "cardEffect": "造成13点伤害",
    "question": "肺淤血(褐色硬化)时，肺泡腔内出现哪种特征性细胞？",
    "options": [
      "A. 心力衰竭细胞(含铁血黄素巨噬细胞)",
      "B. 中性粒细胞",
      "C. 淋巴细胞",
      "D. 泡沫细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "慢性肺淤血时，肺泡腔内红细胞漏出并被巨噬细胞吞噬，血红蛋白分解为含铁血黄素，巨噬细胞变为「心力衰竭细胞」。",
    "textbookReference": "《病理学》第9版 P45",
    "knowledgePoint": "肺淤血",
    "tags": [
      "心力衰竭细胞",
      "淤血"
    ]
  },
  {
    "id": "pathology-epic-014",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "诊断推理",
    "energyCost": 3,
    "cardEffect": "造成8点伤害",
    "question": "下列哪项不是癌前病变？",
    "options": [
      "A. 脂肪瘤",
      "B. 结肠多发性腺瘤性息肉",
      "C. 慢性萎缩性胃炎伴肠上皮化生",
      "D. 宫颈上皮内瘤变(CIN)"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "脂肪瘤是良性肿瘤而非癌前病变。癌前病变包括：结肠腺瘤性息肉、萎缩性胃炎伴肠化、CIN、Barrett食管、白斑等。",
    "textbookReference": "《病理学》第9版 P112",
    "knowledgePoint": "癌前病变",
    "tags": [
      "癌前病变"
    ]
  },
  {
    "id": "pathology-epic-015",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "临床思维攻击",
    "energyCost": 5,
    "cardEffect": "造成13点伤害",
    "question": "坏死的类型不包括以下哪项？",
    "options": [
      "A. 肥大",
      "B. 凝固性坏死",
      "C. 液化性坏死",
      "D. 干酪样坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肥大是细胞适应性反应(增大)而非坏死。坏死类型包括凝固性坏死、液化性坏死、干酪样坏死、脂肪坏死、纤维素样坏死等。",
    "textbookReference": "《病理学》第9版 P30",
    "knowledgePoint": "坏死类型",
    "tags": [
      "坏死",
      "适应性反应"
    ]
  },
  {
    "id": "pathology-epic-016",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "special",
    "cardName": "临床思维爆发",
    "energyCost": 5,
    "cardEffect": "造成13点伤害",
    "question": "慢性胃炎最常见的病因是？",
    "options": [
      "A. 幽门螺杆菌(Hp)感染",
      "B. 自身免疫",
      "C. 药物",
      "D. 酒精"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "幽门螺杆菌感染是慢性胃炎最常见的病因(约90%)，Hp定植于胃黏膜分泌尿素酶、VacA/CagA等毒力因子。",
    "textbookReference": "《病理学》第9版 P195",
    "knowledgePoint": "慢性胃炎",
    "tags": [
      "Hp",
      "慢性胃炎"
    ]
  },
  {
    "id": "pathology-epic-017",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 3,
    "cardEffect": "造成15点伤害",
    "question": "原发综合征(primary complex)包括？",
    "options": [
      "A. 肺原发灶+淋巴管炎+肺门淋巴结结核",
      "B. 仅肺部病变",
      "C. 仅淋巴结肿大",
      "D. 全身粟粒性结核"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原发综合征( Ghon综合征)：肺内原发结核灶(Ghon灶)+引流淋巴管炎+肺门淋巴结肿大，三者构成哑铃状阴影。",
    "textbookReference": "《病理学》第9版 P382",
    "knowledgePoint": "原发综合征",
    "tags": [
      "结核",
      "Ghon"
    ]
  },
  {
    "id": "pathology-epic-018",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "epic",
    "questionType": "single",
    "cardType": "heal",
    "cardName": "知识强化补给",
    "energyCost": 3,
    "cardEffect": "恢复10点HP",
    "question": "原位癌(CIS)是指？",
    "options": [
      "A. 癌细胞局限于上皮层内未突破基底膜",
      "B. 癌组织浸润深度<5mm",
      "C. 仅有淋巴管浸润",
      "D. 远处转移"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "原位癌指异型增生的细胞累及上皮全层但未突破基底膜，不发生转移。早期发现和治疗可完全治愈。",
    "textbookReference": "《病理学》第9版 P115",
    "knowledgePoint": "原位癌",
    "tags": [
      "原位癌",
      "基底膜"
    ]
  },
  {
    "id": "pathology-legendary-001",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "attack",
    "cardName": "病理学考题冲击",
    "energyCost": 6,
    "cardEffect": "造成19点伤害",
    "question": "动脉粥样硬化最早期的病变是？",
    "options": [
      "A. 脂纹(fatty streak)",
      "B. 纤维斑块",
      "C. 粥样斑块",
      "D. 血栓形成"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "动脉粥样硬化最早期病变为脂纹，由泡沫细胞(巨噬细胞吞噬oxLDL)在内膜下聚集形成。",
    "textbookReference": "《病理学》第9版 P155",
    "knowledgePoint": "动脉粥样硬化",
    "tags": [
      "脂纹",
      "AS"
    ]
  },
  {
    "id": "pathology-legendary-002",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 6,
    "cardEffect": "获得17点护盾",
    "question": "下列哪种肿瘤是恶性肿瘤？",
    "options": [
      "A. 精原细胞瘤",
      "B. 脂肪瘤",
      "C. 血管瘤",
      "D. 软骨瘤"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "精原细胞瘤是睾丸的恶性肿瘤(尽管名称以'瘤'结尾)。脂肪瘤、血管瘤、软骨瘤均为良性肿瘤。",
    "textbookReference": "《病理学》第9版 P110",
    "knowledgePoint": "肿瘤命名",
    "tags": [
      "恶性肿瘤",
      "命名"
    ]
  },
  {
    "id": "pathology-legendary-003",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 7,
    "cardEffect": "获得15点护盾",
    "question": "急性肾小管坏死(ATN)最常见的原因是？",
    "options": [
      "A. 肾缺血和肾毒性物质",
      "B. 免疫复合物沉积",
      "C. 细菌感染",
      "D. 遗传因素"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "ATN主要由肾缺血(休克、大手术)和肾毒性物质(氨基糖苷类、造影剂、重金属等)引起，是急性肾衰竭最常见的原因。",
    "textbookReference": "《病理学》第9版 P350",
    "knowledgePoint": "ATN",
    "tags": [
      "ATN",
      "急性肾衰"
    ]
  },
  {
    "id": "pathology-legendary-004",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "defense",
    "cardName": "理论防御",
    "energyCost": 8,
    "cardEffect": "获得17点护盾",
    "question": "肺淤血(褐色硬化)时，肺泡腔内出现哪种特征性细胞？",
    "options": [
      "A. 心力衰竭细胞(含铁血黄素巨噬细胞)",
      "B. 中性粒细胞",
      "C. 淋巴细胞",
      "D. 泡沫细胞"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "慢性肺淤血时，肺泡腔内红细胞漏出并被巨噬细胞吞噬，血红蛋白分解为含铁血黄素，巨噬细胞变为「心力衰竭细胞」。",
    "textbookReference": "《病理学》第9版 P45",
    "knowledgePoint": "肺淤血",
    "tags": [
      "心力衰竭细胞",
      "淤血"
    ]
  },
  {
    "id": "pathology-legendary-005",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "legendary",
    "questionType": "truefalse",
    "cardType": "defense",
    "cardName": "病理学知识护盾",
    "energyCost": 7,
    "cardEffect": "获得17点护盾",
    "question": "良性肿瘤与恶性肿瘤最主要的区别是？",
    "options": [
      "A. 有无转移",
      "B. 肿瘤大小",
      "C. 生长速度",
      "D. 有无包膜"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "转移是恶性肿瘤最可靠的标志，良性肿瘤不发生转移。",
    "textbookReference": "《病理学》第9版 P105",
    "knowledgePoint": "肿瘤良恶性",
    "tags": [
      "肿瘤",
      "转移"
    ]
  },
  {
    "id": "pathology-legendary-006",
    "subject": "病理学",
    "subjectId": "pathology",
    "difficulty": "legendary",
    "questionType": "single",
    "cardType": "special",
    "cardName": "跨学科联动",
    "energyCost": 8,
    "cardEffect": "造成17点伤害",
    "question": "坏死的类型不包括以下哪项？",
    "options": [
      "A. 肥大",
      "B. 凝固性坏死",
      "C. 液化性坏死",
      "D. 干酪样坏死"
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "肥大是细胞适应性反应(增大)而非坏死。坏死类型包括凝固性坏死、液化性坏死、干酪样坏死、脂肪坏死、纤维素样坏死等。",
    "textbookReference": "《病理学》第9版 P30",
    "knowledgePoint": "坏死类型",
    "tags": [
      "坏死",
      "适应性反应"
    ]
  }
];
})();
