import tkinter as tk
from tkinter import ttk

class MinimalApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("최소 기능 앱")
        self.geometry("600x400")
        self.create_widgets()

    def create_widgets(self):
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        # 프레임 생성 및 노트북에 추가
        frames = [
            ("임대인 추가", self.create_add_tenant_widgets),
            ("납부 기록", self.create_add_payment_widgets),
            ("보고서 보기", self.create_view_report_widgets),
            ("임대인 관리", self.create_manage_tenants_widgets),
            ("납부기록 관리", self.create_manage_payments_widgets)
        ]

        for title, create_func in frames:
            frame = ttk.Frame(self.notebook)
            self.notebook.add(frame, text=title)
            create_func(frame)

    def create_add_tenant_widgets(self, parent):
        ttk.Label(parent, text="임대인 추가 탭").pack()

    def create_add_payment_widgets(self, parent):
        ttk.Label(parent, text="납부 기록 탭").pack()

    def create_view_report_widgets(self, parent):
        ttk.Label(parent, text="보고서 보기 탭").pack()

    def create_manage_tenants_widgets(self, parent):
        ttk.Label(parent, text="임대인 관리 탭").pack()

    def create_manage_payments_widgets(self, parent):
        ttk.Label(parent, text="납부기록 관리 탭").pack()

if __name__ == "__main__":
    app = MinimalApp()
    app.mainloop()

