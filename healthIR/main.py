import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from config import Config
from app.app_controller import AppController
from ui.main_window import MainWindow


def main():
    Config.load_locale("zh_TW")
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    Config.load_from_env(env_path)

    controller = AppController()
    if Config.FIREBASE_CRED_PATH:
        cred_path = os.path.join(os.path.dirname(__file__), Config.FIREBASE_CRED_PATH)
        controller.cloud.initialize(cred_path)

    app = MainWindow(controller)
    app.mainloop()


if __name__ == "__main__":
    main()
