// 四项职责 + 十项任务标签映射规则
// 用户选择记录类型后，系统自动关联对应的职责和任务标签

export const RECORD_TYPES = [
  { value: "", label: "通用记录（不归类）" },
  { value: "党建活动", label: "🏛️ 党建活动（三会一课、主题党日、讲党课）" },
  { value: "村务会议", label: "💼 村务会议（四议两公开、村民代表会议）" },
  { value: "产业发展", label: "🌾 产业发展（产业调研、技术指导、消费帮扶）" },
  { value: "入户走访", label: "👣 入户走访（重点户走访、政策宣传）" },
  { value: "项目建设", label: "🏗️ 项目建设（基础设施、环境整治）" },
  { value: "矛盾调解", label: "🤝 矛盾调解（矛盾纠纷化解、信访接待）" },
  { value: "关爱服务", label: "❤️ 关爱服务（留守儿童、残疾人、五保户等）" },
  { value: "学习培训", label: "📚 学习培训（参加培训、政策学习、考察交流）" },
  { value: "其他", label: "📋 其他日常工作" },
];

// 记录类型 → 四项职责 自动映射
export const RECORD_TO_DUTY: Record<string, string[]> = {
  "党建活动": ["建强组织"],
  "村务会议": ["加强治理"],
  "产业发展": ["兴村富民"],
  "入户走访": ["为民服务"],
  "项目建设": ["兴村富民"],
  "矛盾调解": ["加强治理"],
  "关爱服务": ["为民服务"],
  "学习培训": ["建强组织"],
  "其他": [],
};

// 记录类型 → 十项任务（编号）自动映射
export const RECORD_TO_TASK: Record<string, string[]> = {
  "党建活动": ["#5 建强村党组织"],
  "村务会议": ["#9 移风易俗"],
  "产业发展": ["#6 培育兴村富民产业"],
  "入户走访": ["#2 落实入户走访制度"],
  "项目建设": ["#8 持续加强乡村建设"],
  "矛盾调解": ["#9 移风易俗"],
  "关爱服务": ["#2 落实入户走访制度"],
  "学习培训": ["#3 学好用好帮扶政策"],
  "其他": [],
};

// 四项职责列表
export const FOUR_DUTIES = [
  { key: "建强组织", label: "建强组织", icon: "🏛️", taskIndexes: [1, 5, 10] },
  { key: "兴村富民", label: "兴村富民", icon: "🌾", taskIndexes: [4, 6, 7, 8] },
  { key: "加强治理", label: "加强治理", icon: "⚖️", taskIndexes: [9] },
  { key: "为民服务", label: "为民服务", icon: "❤️", taskIndexes: [2, 3] },
];

// 十项任务列表
export const TEN_TASKS = [
  { index: 1, title: "制定驻村帮扶计划", duty: "", icon: "📋" },
  { index: 2, title: "落实入户走访制度", duty: "为民服务", icon: "👣" },
  { index: 3, title: "学好用好帮扶政策", duty: "为民服务", icon: "📖" },
  { index: 4, title: "做好防止返贫监测帮扶", duty: "兴村富民", icon: "⚠️" },
  { index: 5, title: "着力建强村党组织", duty: "建强组织", icon: "🏛️" },
  { index: 6, title: "培育兴村富民产业", duty: "兴村富民", icon: "🌾" },
  { index: 7, title: "培养引进致富能手", duty: "兴村富民", icon: "💡" },
  { index: 8, title: "持续加强乡村建设", duty: "兴村富民", icon: "🏗️" },
  { index: 9, title: "扎实推进移风易俗", duty: "加强治理", icon: "🎭" },
  { index: 10, title: "加强工作队自身建设", duty: "建强组织", icon: "📝" },
];

export function getDutyTags(recordType: string): string[] {
  return RECORD_TO_DUTY[recordType] || [];
}

export function getTaskTags(recordType: string): string[] {
  return RECORD_TO_TASK[recordType] || [];
}
