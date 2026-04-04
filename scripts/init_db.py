from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import Settings
from backend.database import Database


def main() -> None:
    settings = Settings.from_env()
    db = Database(settings.db_path)
    db.init_schema()
    print(f"数据库初始化完成: {settings.db_path}")


if __name__ == "__main__":
    main()
