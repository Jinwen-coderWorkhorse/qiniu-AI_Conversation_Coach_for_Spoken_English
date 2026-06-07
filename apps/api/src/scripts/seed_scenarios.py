from __future__ import annotations

from src.infrastructure.db import create_db_and_tables, get_sessionmaker
from src.infrastructure.repositories.scenario_repository import ScenarioRepository


DEFAULT_SCENARIOS: list[dict] = [
    {
        "slug": "interview",
        "name": "英文面试",
        "summary": "AI 会作为面试官向你提问，请用英语完成一段模拟面试。",
        "estimated_minutes": 5,
        "user_role": "Candidate",
        "ai_role": "Interviewer",
        "opening_message": "Hi, nice to meet you. Could you briefly introduce yourself?",
        "system_prompt": "You are an interviewer. Ask one short interview question at a time.",
        "steps_json": [
            {
                "step_no": 1,
                "title": "30 秒自我介绍",
                "prompt_goal": "让用户完成简短自我介绍。",
                "completion_rule": "用户说明姓名、背景或当前目标。",
            },
            {
                "step_no": 2,
                "title": "介绍一个项目经历",
                "prompt_goal": "让用户描述项目和自己的职责。",
                "completion_rule": "用户说明项目背景和个人贡献。",
            },
            {
                "step_no": 3,
                "title": "回答面试官追问",
                "prompt_goal": "围绕项目细节继续追问。",
                "completion_rule": "用户补充挑战、行动或结果。",
            },
            {
                "step_no": 4,
                "title": "向面试官反问一个问题",
                "prompt_goal": "鼓励用户主动提问。",
                "completion_rule": "用户提出一个与岗位或团队相关的问题。",
            },
        ],
        "sort_order": 1,
    },
    {
        "slug": "restaurant",
        "name": "餐厅点餐",
        "summary": "AI 会作为服务员，陪你完成预订、点餐和结账对话。",
        "estimated_minutes": 5,
        "user_role": "Customer",
        "ai_role": "Waiter",
        "opening_message": "Good evening. Welcome in. Do you have a reservation?",
        "system_prompt": "You are a restaurant waiter. Help the user practice ordering food in English.",
        "steps_json": [
            {
                "step_no": 1,
                "title": "说明是否有预订",
                "prompt_goal": "让用户说明预订情况或人数。",
                "completion_rule": "用户能表达 reservation 或 table for 几个人。",
            },
            {
                "step_no": 2,
                "title": "询问推荐菜品",
                "prompt_goal": "引导用户询问推荐或偏好。",
                "completion_rule": "用户能提出一个关于菜品的问题。",
            },
            {
                "step_no": 3,
                "title": "完成点餐",
                "prompt_goal": "让用户点一份主菜或饮品。",
                "completion_rule": "用户能说出想点的内容。",
            },
            {
                "step_no": 4,
                "title": "请求结账",
                "prompt_goal": "让用户自然提出买单。",
                "completion_rule": "用户能表达 check 或 bill。",
            },
        ],
        "sort_order": 2,
    },
    {
        "slug": "meeting",
        "name": "项目会议",
        "summary": "AI 会作为同事，和你练习会议开场、同步进度和确认下一步。",
        "estimated_minutes": 5,
        "user_role": "Project member",
        "ai_role": "Teammate",
        "opening_message": "Thanks for joining. Could you give a quick update on your progress?",
        "system_prompt": "You are a teammate in a project meeting. Keep the conversation concise and practical.",
        "steps_json": [
            {
                "step_no": 1,
                "title": "同步当前进度",
                "prompt_goal": "让用户说明任务进度。",
                "completion_rule": "用户说明已完成或正在做的事项。",
            },
            {
                "step_no": 2,
                "title": "说明遇到的阻塞",
                "prompt_goal": "引导用户表达问题或风险。",
                "completion_rule": "用户能说明 blocker 或 concern。",
            },
            {
                "step_no": 3,
                "title": "讨论解决方案",
                "prompt_goal": "让用户提出一个下一步建议。",
                "completion_rule": "用户提出一个 action 或 request。",
            },
            {
                "step_no": 4,
                "title": "确认行动项",
                "prompt_goal": "让用户复述下一步和负责人。",
                "completion_rule": "用户能确认 owner 和 deadline。",
            },
        ],
        "sort_order": 3,
    },
]


def seed_scenarios() -> None:
    create_db_and_tables()
    session_factory = get_sessionmaker()
    with session_factory() as db:
        repo = ScenarioRepository(db)
        for scenario in DEFAULT_SCENARIOS:
            repo.upsert(scenario)
        db.commit()


def main() -> None:
    seed_scenarios()
    print("Seeded 3 scenarios.")


if __name__ == "__main__":
    main()
