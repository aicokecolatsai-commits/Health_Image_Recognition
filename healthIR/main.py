import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from config import Config
from app.app_controller import AppController
from ui.main_window import MainWindow


def main():
    controller = AppController()
    app = MainWindow(controller)
    app.mainloop()


if __name__ == "__main__":
    main()