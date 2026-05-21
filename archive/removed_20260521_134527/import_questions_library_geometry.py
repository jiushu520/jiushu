#!/usr/bin/env python3
import ast
import json
from collections import OrderedDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
SOURCE = BASE_DIR / "questions_library.py"
DATA_DIR = BASE_DIR / "data"
MENU_PATH = BASE_DIR / "config" / "menu.js"

TARGET_PREFIXES = ("F01", "F03")
MENU_CATEGORY = "几何（SVG）"
FILE_PREFIX = "题库中心"
REMOVED_GEOMETRY_CATEGORIES = {"几何", "几何题库增强（SVG）", MENU_CATEGORY}
EXCLUDED_GROUP_IDS = {"F0306"}


def normalize_question_text(question):
    text = question.get("text", "")
    return text


def load_questions():
    module = ast.parse(SOURCE.read_text(encoding="utf-8"))
    for node in module.body:
        if isinstance(node, ast.Assign):
            if any(getattr(target, "id", None) == "QUESTIONS_DATA" for target in node.targets):
                return ast.literal_eval(node.value)
    raise RuntimeError("未找到 QUESTIONS_DATA")


def load_menu():
    raw = MENU_PATH.read_text(encoding="utf-8").strip()
    prefix = "window.JIUSHU_MENU = "
    if not raw.startswith(prefix):
        raise RuntimeError("menu.js 格式不符合预期")
    return json.loads(raw[len(prefix):].rstrip(";"))


def write_quiz_file(topic, questions):
    normalized = []
    seen = set()
    for index, question in enumerate(questions, start=1):
        solutions = [str(item) for item in question.get("answer", {}).get("solution", [])]
        equation = normalize_question_text(question)
        signature = (equation, tuple(solutions))
        if signature in seen:
            continue
        seen.add(signature)
        normalized.append({
            "id": f"{question['group_id']}-{len(normalized) + 1:02d}",
            "groupId": question["group_id"],
            "difficulty": question.get("difficulty"),
            "equation": equation,
            "answer": question.get("answer", {}),
            "correctOption": {"single": solutions[0]} if solutions else {},
            "acceptedAnswers": solutions,
            "source": "questions_library.py"
        })

    content = "window.JIUSHU_QUIZ = " + json.dumps({
        "topic": topic,
        "questions": normalized
    }, ensure_ascii=False, indent=2) + ";\n"

    file_name = f"{FILE_PREFIX}{topic}.js"
    (DATA_DIR / file_name).write_text(content, encoding="utf-8")
    return file_name[:-3]


def main():
    all_questions = load_questions()
    grouped = OrderedDict()
    for question in all_questions:
        group_id = str(question.get("group_id", ""))
        if group_id in EXCLUDED_GROUP_IDS:
            continue
        if not group_id.startswith(TARGET_PREFIXES):
            continue
        topic = question.get("name") or group_id
        grouped.setdefault(topic, []).append(question)

    menu_items = []
    for topic, questions in grouped.items():
        file_stem = write_quiz_file(topic, questions)
        menu_items.append({
            "name": f"{topic}（SVG）",
            "file": file_stem,
            "isExternal": False
        })

    menu = [
        category for category in load_menu()
        if category.get("category") not in REMOVED_GEOMETRY_CATEGORIES
    ]
    geometry_index = next(
        (index for index, category in enumerate(menu) if category.get("category") == "几何"),
        len(menu) - 1
    )
    menu.insert(geometry_index + 1, {
        "category": MENU_CATEGORY,
        "items": menu_items
    })

    MENU_PATH.write_text(
        "window.JIUSHU_MENU = " + json.dumps(menu, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8"
    )

    print(f"已导入 {len(menu_items)} 个几何 SVG 专题，来自 {sum(len(v) for v in grouped.values())} 道题。")


if __name__ == "__main__":
    main()
