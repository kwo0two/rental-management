import json
from datetime import datetime, date, timedelta
import os
import shutil
import threading
import time
import tempfile
import webbrowser
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import pandas as pd
import traceback  # 추가
from tkcalendar import DateEntry  # 파일 상단에 추가
import locale
import win32api  # 추가

# locale 설정 부분을 다음과 같이 수정
try:
    locale.setlocale(locale.LC_ALL, 'ko_KR.UTF-8')  # 첫 번째 시도
except locale.Error:
    try:
        locale.setlocale(locale.LC_ALL, 'ko_KR')    # 두 번째 시도
    except locale.Error:
        locale.setlocale(locale.LC_ALL, '')         # 시스템 기본값 사용

class RentalManagement:
    def __init__(self):
        self.buildings = {}

    def add_building(self, building_name):
        if building_name not in self.buildings:
            self.buildings[building_name] = {}

    def add_tenant(self, building_name, tenant_name, start_date, monthly_rent, payment_type="full"):
        if building_name not in self.buildings:
            raise ValueError("존재하지 않는 건물입니다.")
        
        self.buildings[building_name][tenant_name] = {
            'start_date': datetime.strptime(start_date, '%Y-%m-%d').date(),
            'monthly_rent': float(monthly_rent),
            'payments': [],
            'payment_type': payment_type  # 결제 방식 추가
        }

    def add_payment(self, building_name, tenant_name, payment_date, amount):
        if building_name not in self.buildings or tenant_name not in self.buildings[building_name]:
            raise ValueError("존재하지 않는 건물 또는 임대인입니다.")
        
        try:
            payment_date = datetime.strptime(payment_date, '%Y-%m-%d').date()
            amount = float(amount)
        except ValueError:
            raise ValueError("날짜 형식(YYYY-MM-DD) 또는 금액이 올바르지 않습니다.")
        
        self.buildings[building_name][tenant_name]['payments'].append({'date': payment_date, 'amount': amount})
        self.buildings[building_name][tenant_name]['payments'].sort(key=lambda x: x['date'])

    def calculate_balance(self, building_name, tenant_name):
        if building_name not in self.buildings or tenant_name not in self.buildings[building_name]:
            raise ValueError("존재하지 않 건물 또는 임대입니다.")
        
        tenant = self.buildings[building_name][tenant_name]
        today = datetime.now().date()
        start_date = tenant['start_date']
        
        current_date = start_date.replace(day=1)
        end_date = today.replace(day=1)
        
        total_rent = 0
        while current_date <= end_date:
            total_rent += self.get_monthly_rent(building_name, tenant_name, current_date)
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        total_paid = sum(payment['amount'] for payment in tenant['payments'])
        return total_rent - total_paid

    def generate_report(self, building_name, tenant_name):
        try:
            if building_name not in self.buildings or tenant_name not in self.buildings[building_name]:
                raise ValueError("존재하지 않는 건물 또는 임대인입니다.")
            
            tenant = self.buildings[building_name][tenant_name]
            start_date = tenant['start_date']
            today = datetime.now().date()
            contract_end_date = tenant.get('contract_end_date')
            
            # 시작 월의 막 날짜 계산
            start_month_last_day = (start_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            start_month_days = start_month_last_day.day
            remaining_days = start_month_days - start_date.day + 1
            
            # 데이터프레임 생성
            date_range = pd.date_range(start=start_date.replace(day=1), end=today, freq='MS')
            df = pd.DataFrame(index=date_range, columns=('임대료', '납부일자', '납부액', '잔액', '비고'))
            
            # 임대료 계산
            for idx in date_range:
                date = idx.date()
                monthly_rent = self.get_monthly_rent(building_name, tenant_name, date)
                
                # 첫 달 일할 계산
                if date.year == start_date.year and date.month == start_date.month:
                    if tenant.get('payment_type') == 'prorated':
                        daily_rent = monthly_rent / start_month_days
                        monthly_rent = daily_rent * remaining_days
                        df.at[idx, '비고'] = f"일할계산({remaining_days}일)"
                
                # 마지막 달 일할 계산
                if contract_end_date and date.year == contract_end_date.year and date.month == contract_end_date.month:
                    month_last_day = (date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                    month_days = month_last_day.day
                    used_days = contract_end_date.day
                    
                    daily_rent = monthly_rent / month_days
                    monthly_rent = daily_rent * used_days
                    
                    current_note = df.at[idx, '비고'] if pd.notna(df.at[idx, '비고']) else ""
                    separator = ", " if current_note else ""
                    df.at[idx, '비고'] = f"{current_note}{separator}만료일할계산({used_days}일)"
                
                df.at[idx, '임대료'] = monthly_rent
            
            # 납부액 초기화
            df['납부액'] = 0
            
            # 납부 기록 처리
            date_index = df.index.map(lambda x: x.date())
            for payment in tenant['payments']:
                payment_month = payment['date'].replace(day=1)
                try:
                    idx_pos = date_index.get_loc(payment_month)
                    df.iloc[idx_pos, df.columns.get_loc('납부액')] += payment['amount']
                    df.at[df.index[idx_pos], '납부일자'] = payment['date'].strftime('%Y-%m-%d')
                except KeyError:
                    pass
            
            # 잔액 계산
            df['잔액'] = (df['임대료'].cumsum() - df['납부액'].cumsum())
            
            # 데이터 형식 정리
            df['임대료'] = df['임대료'].apply(lambda x: f"{int(x):,}원")
            df['납부액'] = df['납부액'].apply(lambda x: '-' if x == 0 else f"{int(x):,}원")
            df['잔액'] = df['잔액'].apply(lambda x: f"{int(x):,}원")
            
            # 비고 컬럼 처리 (기존 비고 정보 유지)
            if 'monthly_rent_overrides' in tenant:
                for month, override in tenant['monthly_rent_overrides'].items():
                    month_date = datetime.fromisoformat(month).date()
                    if month_date in date_index:
                        if isinstance(override, dict):
                            note = override.get('note', '')
                            if note:
                                current_note = df.at[month_date, '비고']
                                df.at[month_date, '비고'] = f"{current_note}, {note}" if current_note else note
            
            # 인덱스를 월 열로 변환
            df = df.reset_index()
            df['index'] = df['index'].dt.strftime('%Y-%m')
            df = df.rename(columns={'index': '월'})
            
            # NaN 값을 빈 문열로 변환
            df = df.fillna('')
            
            return df
            
        except Exception as e:
            print(f"보고서 생성 중 오류 발생: {str(e)}")
            return None

    def save_data(self):
        data = {building: {tenant: {**info, 
                                    'start_date': info['start_date'].isoformat(), 
                                    'contract_end_date': info.get('contract_end_date').isoformat() if 'contract_end_date' in info else None,
                                    'payments': [{**p, 'date': p['date'].isoformat()} for p in info['payments']]}
                           for tenant, info in tenants.items()}
                for building, tenants in self.buildings.items()}
        
        with open('rental_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_data(self):
        try:
            with open('rental_data.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.buildings = {}  # 기존 데이터 초기화
                
                for building, tenants in data.items():
                    self.buildings[building] = {}
                    if isinstance(tenants, dict):  # tenants가 딕셔너리인 경우에만 처리
                        for tenant, info in tenants.items():
                            tenant_data = {
                                'start_date': datetime.fromisoformat(info['start_date']).date(),
                                'monthly_rent': float(info['monthly_rent']),
                                'payments': [],
                                'payment_type': info.get('payment_type', 'full')  # 결제 방식 로드 추가
                            }
                            
                            # 납부 기록 처리
                            if 'payments' in info:
                                for payment in info['payments']:
                                    tenant_data['payments'].append({
                                        'date': datetime.fromisoformat(payment['date']).date(),
                                        'amount': float(payment['amount'])
                                    })
                            
                            # 계약 만료일 처리
                            if 'contract_end_date' in info and info['contract_end_date']:
                                tenant_data['contract_end_date'] = datetime.fromisoformat(info['contract_end_date']).date()
                            
                            # 임대료 수정 기록 처리
                            if 'monthly_rent_overrides' in info:
                                tenant_data['monthly_rent_overrides'] = {
                                    datetime.fromisoformat(date).date().isoformat(): amount
                                    for date, amount in info['monthly_rent_overrides'].items()
                                }
                            
                            self.buildings[building][tenant] = tenant_data
                
                print(f"데이터 로드 완료: {len(self.buildings)} 개의 건물, {sum(len(tenants) for tenants in self.buildings.values())} 명의 임대인 정보를 불러왔습니다.")
                # 디버깅을 위한 상세 정보 출력
                for building, tenants in self.buildings.items():
                    print(f"\n건물: {building}")
                    for tenant, info in tenants.items():
                        print(f"  임대인: {tenant}")
                        print(f"    시작일: {info['start_date']}")
                        print(f"    월 임대료: {info['monthly_rent']}")
                        print(f"    결제 방식: {info.get('payment_type', 'full')}")  # 결제 방식 출력 추가
                        print(f"    납부 기록 수: {len(info['payments'])}")
                
        except FileNotFoundError:
            print("rental_data.json 파일을 찾을 수 없습니다. 새로운 데이터를 시작합니다.")
            self.buildings = {}
        except json.JSONDecodeError as e:
            print(f"JSON 일 형식이 올바르지 않음: {str(e)}")
            self.buildings = {}
        except Exception as e:
            print(f"데이터 로드 중 오류 발생: {str(e)}")
            print(f"상세 오류 보고: {traceback.format_exc()}")
            self.buildings = {}

    def add_monthly_rent_override(self, building_name, tenant_name, date, amount, note=''):
        if building_name not in self.buildings or tenant_name not in self.buildings[building_name]:
            raise ValueError("존재하지 않는 건물 또는 임대인입니다.")
        
        if 'monthly_rent_overrides' not in self.buildings[building_name][tenant_name]:
            self.buildings[building_name][tenant_name]['monthly_rent_overrides'] = {}
        
        month_key = date.replace(day=1).isoformat()
        self.buildings[building_name][tenant_name]['monthly_rent_overrides'][month_key] = {
            'amount': float(amount),
            'note': note
        }

    def get_monthly_rent(self, building_name, tenant_name, date):
        tenant = self.buildings[building_name][tenant_name]
        month_key = date.replace(day=1).isoformat()
        
        if 'monthly_rent_overrides' in tenant and month_key in tenant['monthly_rent_overrides']:
            override_value = tenant['monthly_rent_overrides'][month_key]
            # 새로 형식(dict)인 경우
            if isinstance(override_value, dict):
                return override_value['amount']
            # 이전 형식(float)인 경우
            else:
                return override_value
        return tenant['monthly_rent']

    def bulk_rent_increase(self, building_name, tenant_name, start_date, increase_amount, is_percentage=True):
        if building_name not in self.buildings or tenant_name not in self.buildings[building_name]:
            raise ValueError("존재하지 않는 건물 또는 임대인입니다.")
        
        tenant = self.buildings[building_name][tenant_name]
        start_date = start_date.replace(day=1)
        
        base_rent = tenant['monthly_rent']
        if is_percentage:
            increase = base_rent * (increase_amount / 100)
        else:
            increase = increase_amount
        
        current_date = start_date
        end_date = datetime.now().date().replace(day=1)
        
        while current_date <= end_date:
            month_key = current_date.isoformat()
            
            if 'monthly_rent_overrides' in tenant and month_key in tenant['monthly_rent_overrides']:
                current_rent = tenant['monthly_rent_overrides'][month_key]['amount']
            else:
                current_rent = base_rent
                
            if is_percentage:
                new_rent = current_rent * (1 + increase_amount / 100)
            else:
                new_rent = current_rent + increase_amount
                
            self.add_monthly_rent_override(building_name, tenant_name, current_date, new_rent)
            
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)

class RentalApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("임대료 관리 시스템 v1.0")
        self.geometry("1000x700")  # 창 크기 증가
        
        # 스타일 설정
        self.style = ttk.Style()
        self.style.theme_use('clam')  # 기본 테마 설정
        
        # 전체 배경색 설정
        self.configure(bg='#f0f0f0')
        self.style.configure('TFrame', background='#f0f0f0')
        self.style.configure('TLabelframe', background='#f0f0f0')
        self.style.configure('TLabelframe.Label', background='#f0f0f0')
        
        # 버튼 스타일
        self.style.configure('TButton',
                            padding=6,
                            relief="flat",
                            background="#2980b9",
                            foreground="white",
                            font=('맑은 고딕', 9))
        
        # 버튼 호버 효과
        self.style.map('TButton',
                      background=[('active', '#3498db')],
                      relief=[('pressed', 'flat')])
        
        # 레이블 스타일
        self.style.configure('TLabel',
                            font=('맑은 고딕', 9),
                            background='#f0f0f0')
        
        # 트리뷰 스타일
        self.style.configure('Treeview',
                            background='white',
                            fieldbackground='white',
                            font=('맑은 고딕', 9))
        self.style.configure('Treeview.Heading',
                            font=('맑은 고딕', 9, 'bold'),
                            background='#2980b9',
                            foreground='white')
        
        # 노트북(탭) 스타일
        self.style.configure('TNotebook',
                            background='#f0f0f0',
                            tabmargins=[2, 5, 2, 0])
        self.style.configure('TNotebook.Tab',
                            padding=[10, 2],
                            font=('맑은 고딕', 9))
        
        # 콤보박스 스타일
        self.style.configure('TCombobox',
                            font=('맑은 고딕', 9))
        
        # 엔트리 스타일
        self.style.configure('TEntry',
                            font=('맑은 고딕', 9))
        
        # 프레임 패딩 설정
        self.style.configure('TLabelframe',
                            padding=10)
        
        # 리스트박스 폰트 설정
        self.option_add('*TListbox*Font', ('맑은 고딕', 9))
        
        # 메시지박스 스타일
        self.option_add('*Dialog.msg.font', ('맑은 고딕', 9))
        
        # 삭제 버튼을 위한 새로운 스타일 추가
        self.style.configure('Danger.TButton',
                            padding=6,
                            relief="flat",
                            background="#e74c3c",  # 빨간색
                            foreground="white",
                            font=('맑은 고딕', 9))
        
        # 삭제 버튼 호버 효과
        self.style.map('Danger.TButton',
                      background=[('active', '#c0392b')],  # 더 진한 빨간색
                      relief=[('pressed', 'flat')])
        
        self.rental_manager = RentalManagement()
        self.rental_manager.load_data()
        self.notification_enabled = tk.BooleanVar(value=True)
        
        self.create_menu()
        self.create_widgets()
        self.start_notification_thread()
        self.update_dashboard()
        
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def start_notification_thread(self):
        """알림 스레드 시작"""
        self.notification_thread = threading.Thread(target=self.check_notifications, daemon=True)
        self.notification_thread.start()

    def check_notifications(self):
        """정기적으로 알림 확인"""
        while True:
            if self.notification_enabled.get():
                try:
                    today = datetime.now().date()
                    
                    # 모든 임대인에 대해 체크
                    for building in self.rental_manager.buildings:
                        for tenant_name, tenant in self.rental_manager.buildings[building].items():
                            # 미납금 확인
                            balance = self.rental_manager.calculate_balance(building, tenant_name)
                            if balance > 0:
                                # 계약 만료 확인
                                if 'contract_end_date' in tenant:
                                    days_to_expiry = (tenant['contract_end_date'] - today).days
                                    if 0 < days_to_expiry <= 30:
                                        self.show_notification(
                                            f"계약 만료 예정",
                                            f"{building} - {tenant_name}의 계약이 {days_to_expiry}일 후 만료됩니다."
                                        )
                
                except Exception as e:
                    print(f"알림 확인 중 오류 발생: {str(e)}")
            
            # 24시간마다 체
            time.sleep(86400)  # 24시간 = 86400초

    def show_notification(self, title, message):
        """알림 표시"""
        messagebox.showinfo(title, message)

    def create_menu(self):
        """메뉴 생성"""
        menu_bar = tk.Menu(self)

        # 파일 메뉴
        file_menu = tk.Menu(menu_bar, tearoff=0)
        file_menu.add_command(label="데이터 저장", command=self.rental_manager.save_data)
        
        # 백업 서브메뉴 추가
        backup_menu = tk.Menu(file_menu, tearoff=0)
        backup_menu.add_command(label="백업 생성", command=self.create_backup)
        backup_menu.add_command(label="백업 복원", command=self.restore_backup)
        file_menu.add_cascade(label="백업", menu=backup_menu)
        
        # 데이터 초기화 메뉴 추가
        file_menu.add_separator()
        file_menu.add_command(label="데이터 초기화", command=self.initialize_data)
        
        file_menu.add_separator()
        file_menu.add_command(label="종료", command=self.on_closing)
        menu_bar.add_cascade(label="파일", menu=file_menu)

        # 도움말 메뉴
        help_menu = tk.Menu(menu_bar, tearoff=0)
        help_menu.add_command(label="사용법", command=self.show_help)
        menu_bar.add_cascade(label="도움말", menu=help_menu)

        self.config(menu=menu_bar)

    def initialize_data(self):
        """데이터 초기화"""
        if messagebox.askyesno("확인", 
                              "모든 데이터가 삭제됩니다.\n"
                              "현재 데이터는 자동으로 백업됩니다.\n"
                              "계속하시겠습니까?"):
            try:
                # 현재 데이터 백업
                backup_dir = "backups"
                if not os.path.exists(backup_dir):
                    os.makedirs(backup_dir)
                
                current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_file = os.path.join(backup_dir, f"rental_data_before_initialize_{current_time}.json")
                
                if os.path.exists('rental_data.json'):
                    shutil.copy2('rental_data.json', backup_file)
                
                # 데이터 초기화
                self.rental_manager.buildings = {}
                self.rental_manager.save_data()
                
                # UI 업데이트
                self.update_dashboard()
                
                messagebox.showinfo("성공", 
                                  f"데이터가 초기화되었습니다.\n"
                                  f"이전 데이터는 {backup_file}에 백업되었습니다.")
                
            except Exception as e:
                messagebox.showerror("오류", f"데이터 초기화 중 오류가 발생했습니다: {str(e)}")

    def create_backup(self):
        """데이터 백업 생성"""
        try:
            # 백업 폴더 생성
            backup_dir = "backups"
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
            
            # 현재 시간을 포함한 백업 파일명 생성
            current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(backup_dir, f"rental_data_backup_{current_time}.json")
            
            # 현재 데이터 파일을 백업 폴더로 복사
            shutil.copy2('rental_data.json', backup_file)
            
            messagebox.showinfo("성공", f"백업이 생성되었습니다.\n저장 치: {backup_file}")
        except Exception as e:
            messagebox.showerror("오류", f"백업 생성 중 오류가 발생했습니다: {str(e)}")

    def restore_backup(self):
        """백업 데이터 복원"""
        try:
            backup_dir = "backups"
            if not os.path.exists(backup_dir):
                messagebox.showerror("오류", "백업 폴더가 존재하지 않습니다.")
                return
            
            # 백업 파일 선택 대화상자 표시
            backup_file = filedialog.askopenfilename(
                initialdir=backup_dir,
                title="복원할 백업 파일 선택",
                filetypes=[("JSON files", "*.json")]
            )
            
            if backup_file:
                # 현재 데이터 파일 백업
                current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
                temp_backup = os.path.join(backup_dir, f"rental_data_before_restore_{current_time}.json")
                shutil.copy2('rental_data.json', temp_backup)
                
                # 선한 백업 파일을 현재 데이터 파일로 복사
                shutil.copy2(backup_file, 'rental_data.json')
                
                # 데이터 다시 로드
                self.rental_manager.load_data()
                self.update_dashboard()
                
                messagebox.showinfo("성공", 
                                    f"백업이 복원되었습니다.\n"
                                    f"이전 데이터는 {temp_backup}에 백업되었습니다.")
        except Exception as e:
            messagebox.showerror("오류", f"백업 복원 중 오류가 발생했습니다: {str(e)}")

    def on_closing(self):
        """프로그램 종료 시 호출되는 메서드"""
        try:
            # 데이터 저장
            self.rental_manager.save_data()
            # 알림 스레드 종료
            self.notification_enabled.set(False)
            time.sleep(0.5)  # 스레드가 종될 시간을 줌
            
            # Matplotlib 창들 닫
            plt.close('all')
            
            # 메인 윈도우 종료
            self.quit()  # Tkinter 이벤트 루프 종료
            self.destroy()  # 윈도우 파괴
            os._exit(0)  # 강제 종료
            
        except Exception as e:
            print(f"종료  오류 발생: {str(e)}")
            os._exit(1)  # 오류 발생 시에도 강제 종료

    def show_help(self):
        """움말 표시"""
        messagebox.showinfo("도움말", "이 프로그램은 임대료 관리 시스템입니다.")

    def create_widgets(self):
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(expand=True, fill='both', padx=10, pady=10)

        # 프레임 생성
        dashboard_frame = ttk.Frame(self.notebook)
        building_frame = ttk.Frame(self.notebook)
        add_tenant_frame = ttk.Frame(self.notebook)
        add_payment_frame = ttk.Frame(self.notebook)
        view_report_frame = ttk.Frame(self.notebook)
        manage_tenant_frame = ttk.Frame(self.notebook)
        manage_payment_frame = ttk.Frame(self.notebook)

        # 먼저 모든 위젯 생성
        self.create_building_widgets(building_frame)  # building_listbox 생성
        self.create_dashboard_widgets(dashboard_frame)
        self.create_add_tenant_widgets(add_tenant_frame)
        self.create_add_payment_widgets(add_payment_frame)
        self.create_view_report_widgets(view_report_frame)
        self.create_manage_tenant_widgets(manage_tenant_frame)
        self.create_manage_payment_frame(manage_payment_frame)

        # 탭 추가
        self.notebook.add(dashboard_frame, text="대시보드")
        self.notebook.add(building_frame, text="건물 관리")
        self.notebook.add(add_tenant_frame, text="임대인 추가")
        self.notebook.add(add_payment_frame, text="납부 기록")
        self.notebook.add(view_report_frame, text="임대료 납부현황")
        self.notebook.add(manage_tenant_frame, text="임대인 관리")
        self.notebook.add(manage_payment_frame, text="납부기록 관리")

        # 마지막으로 대시보드 업데이트
        self.update_dashboard()

    def add_tenant(self):
        building_name = self.building_name.get()
        tenant_name = self.tenant_name.get()
        start_date = self.start_date.get()
        monthly_rent = self.monthly_rent.get()
        payment_type = self.payment_type.get()
        contract_end_date = self.contract_end_date.get()
        
        if building_name and tenant_name and start_date and monthly_rent:
            try:
                # 건물이 존재하지 않으면 추가
                if building_name not in self.rental_manager.buildings:
                    self.rental_manager.add_building(building_name)
                
                # 이미 존재하는 임대인인지 확인
                if tenant_name in self.rental_manager.buildings[building_name]:
                    messagebox.showerror("오류", "이미 재하는 임대인입니다.")
                    return
                
                # 임대인 추가
                self.rental_manager.add_tenant(building_name, tenant_name, start_date, monthly_rent, payment_type)
                
                # 계약 만료일이 입력된 경우 추가
                if contract_enddate:
                    self.rental_manager.buildings[building_name][tenant_name]['contract_end_date'] = \
                        datetime.strptime(contract_enddate, '%Y-%m-%d').date()
                
                # 데이터 저장 및 화면 갱신
                self.rental_manager.save_data()
                self.update_dashboard()
                
                # 입력 필드 초기화
                self.building_name.set('')
                self.tenant_name.delete(0, tk.END)
                self.start_date.delete(0, tk.END)
                self.monthly_rent.delete(0, tk.END)
                self.contract_end_date.delete(0, tk.END)
                self.payment_type.set("full")
                
                messagebox.showinfo("성공", f"{tenant_name}이(가) 추가되었습니다.")
                
            except ValueError as e:
                messagebox.showerror("오류", str(e))
        else:
            messagebox.showerror("오류", "모든 필드를 입력해주세.")

    def create_dashboard_widgets(self, parent):
        # 단 프레임 - 통계 정보
        stats_frame = ttk.LabelFrame(parent, text="전체 통계")
        stats_frame.pack(fill='x', padx=5, pady=5)
        
        ttk.Label(stats_frame, text="총 임대인 수:").grid(row=0, column=0, padx=5, pady=5)
        self.total_tenants_label = ttk.Label(stats_frame, text="0")
        self.total_tenants_label.grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Label(stats_frame, text="이번 달 예상 임대료:").grid(row=1, column=0, padx=5, pady=5)
        self.monthly_total_label = ttk.Label(stats_frame, text="0원")
        self.monthly_total_label.grid(row=1, column=1, padx=5, pady=5)
        
        ttk.Label(stats_frame, text="전체 미납금:").grid(row=2, column=0, padx=5, pady=5)
        self.total_unpaid_label = ttk.Label(stats_frame, text="0원")
        self.total_unpaid_label.grid(row=2, column=1, padx=5, pady=5)
        
        # 중간 프레임 - 임대인 목록
        tenant_frame = ttk.LabelFrame(parent, text="임대인 목록")
        tenant_frame.pack(fill='both', expand=True, padx=5, pady=5)
        
        # 임대인 목록 리스트박스 추가
        self.tenant_listbox = tk.Listbox(tenant_frame)
        self.tenant_listbox.pack(fill='both', expand=True, padx=5, pady=5)
        
        # 하단 프레임 - 미납 정보
        unpaid_frame = ttk.LabelFrame(parent, text="이번 달 미납")
        unpaid_frame.pack(fill='both', expand=True, padx=5, pady=5)
        
        self.unpaid_tree = ttk.Treeview(unpaid_frame, columns=('name', 'amount'), show='headings')
        self.unpaid_tree.heading('name', text='임대인')
        self.unpaid_tree.heading('amount', text='미납액')
        self.unpaid_tree.pack(fill='both', expand=True, padx=5, pady=5)

        # 대시보드 업데이트
        self.update_dashboard()

    def create_building_widgets(self, parent):
        # 왼쪽 프레임 (건물 목록)
        left_frame = ttk.Frame(parent)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # 건물 목록 레이블
        ttk.Label(left_frame, text="건물 목록").pack(pady=5)
        
        # 건물 목록 리스트박스와 스크롤바
        list_frame = ttk.Frame(left_frame)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        self.building_listbox = tk.Listbox(list_frame, width=30)
        self.building_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.building_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.building_listbox.configure(yscrollcommand=scrollbar.set)
        
        # 오른쪽 프레임 (건물 추가/수정/삭제)
        right_frame = ttk.Frame(parent)
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # 건물 이름 입력
        ttk.Label(right_frame, text="건물 이름:").pack(pady=5)
        self.new_building_name = ttk.Entry(right_frame)
        self.new_building_name.pack(fill=tk.X, padx=5, pady=5)
        
        # 버튼 프레임
        button_frame = ttk.Frame(right_frame)
        button_frame.pack(pady=10)
        
        ttk.Button(button_frame, text="건물 추가", command=self.add_building).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="건물 수정", command=self.edit_building).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="건물 삭제", style='Danger.TButton', command=self.delete_building).pack(side=tk.LEFT, padx=5)
        
        # 건물 선택 시 이벤트 바인딩
        self.building_listbox.bind('<<ListboxSelect>>', self.on_building_select)
        
        self.update_building_listbox()

    def update_building_listbox(self):
        self.building_listbox.delete(0, tk.END)
        for building in sorted(self.rental_manager.buildings.keys()):
            self.building_listbox.insert(tk.END, building)

    def add_building(self):
        building_name = self.new_building_name.get().strip()
        if building_name:
            if building_name in self.rental_manager.buildings:
                messagebox.showerror("오류", "이미 존재하는 건물 이름입니다.")
            else:
                self.rental_manager.add_building(building_name)
                self.rental_manager.save_data()
                self.update_all_building_lists()
                self.new_building_name.delete(0, tk.END)
                messagebox.showinfo("성공", f"건물 '{building_name}'이(가) 추가되었습니다.")
        else:
            messagebox.showerror("오류", "건물 이름을 입력해주세요.")

    def edit_building(self):
        selected = self.building_listbox.curselection()
        if not selected:
            messagebox.showerror("오류", "수정할 건물을 선택해주세요.")
            return
        
        old_name = self.building_listbox.get(selected)
        new_name = self.new_building_name.get().strip()
        
        if not new_name:
            messagebox.showerror("오류", "새 건물 이름을 입력해주세요.")
            return
        
        if new_name != old_name and new_name in self.rental_manager.buildings:
            messagebox.showerror("오류", "이미 존재하는 건물 이름입니다.")
            return
        
        # 건물 름 변경
        self.rental_manager.buildings[new_name] = self.rental_manager.buildings.pop(old_name)
        self.rental_manager.save_data()
        self.update_all_building_lists()
        self.new_building_name.delete(0, tk.END)
        messagebox.showinfo("성공", f"건물 이름이 '{old_name}'에서 '{new_name}'으로 변경되었습니다.")

    def delete_building(self):
        selected = self.building_listbox.curselection()
        if not selected:
            messagebox.showerror("오류", "삭제할 건물을 선택해주세요.")
            return
        
        building_name = self.building_listbox.get(selected)
        if messagebox.askyesno("확인", f"'{building_name}'과(와) 관련된 모든 임대인 정보가 삭제됩니다.\n계속하시겠습니까?"):
            del self.rental_manager.buildings[building_name]
            self.rental_manager.save_data()
            self.update_all_building_lists()
            self.new_building_name.delete(0, tk.END)
            messagebox.showinfo("성공", f"건물 '{building_name}'이(가) 삭제되었습니다.")

    def on_building_select(self, event):
        selected = self.building_listbox.curselection()
        if selected:
            building_name = self.building_listbox.get(selected)
            self.new_building_name.delete(0, tk.END)
            self.new_building_name.insert(0, building_name)

    def update_all_building_lists(self):
        """모든 탭의 건물 목록 업데이트"""
        self.update_building_listbox()
        self.update_dashboard()
        
        # 콤보박스 업데이트
        building_list = list(self.rental_manager.buildings.keys())
        self.add_payment_building_name['values'] = building_list
        self.report_building_name['values'] = building_list
        self.edit_building_name['values'] = building_list
        self.payment_building_name['values'] = building_list

    def create_add_tenant_widgets(self, parent):
        ttk.Label(parent, text="건물 이름:").grid(row=0, column=0, padx=5, pady=5, sticky='e')
        self.building_name = ttk.Combobox(parent, values=list(self.rental_manager.buildings.keys()))
        self.building_name.grid(row=0, column=1, padx=5, pady=5)

        ttk.Label(parent, text="임대인 이름:").grid(row=1, column=0, padx=5, pady=5, sticky='e')
        self.tenant_name = ttk.Entry(parent)
        self.tenant_name.grid(row=1, column=1, padx=5, pady=5)

        ttk.Label(parent, text="임대 시작일:").grid(row=2, column=0, padx=5, pady=5, sticky='e')
        date_frame = ttk.Frame(parent)
        date_frame.grid(row=2, column=1, padx=5, pady=5, sticky='w')
        
        self.start_date = ttk.Entry(date_frame, width=15)
        self.start_date.pack(side='left', padx=(0, 5))  # 수정된 부분
        
        self.start_date_cal = DateEntry(date_frame, width=12, background='darkblue',
                                      foreground='white', borderwidth=2,
                                      date_pattern='yyyy-mm-dd',
                                      locale='ko_KR')
        self.start_date_cal.pack(side='left')
        self.start_date_cal.bind("<<DateEntrySelected>>", 
                               lambda e: self.start_date.delete(0, tk.END) or 
                                       self.start_date.insert(0, self.start_date_cal.get()))

        ttk.Label(parent, text="월 임대료:").grid(row=3, column=0, padx=5, pady=5, sticky='e')
        self.monthly_rent = ttk.Entry(parent)
        self.monthly_rent.grid(row=3, column=1, padx=5, pady=5)

        # 결제 방식 선택 프레임 추가
        payment_type_frame = ttk.LabelFrame(parent, text="결제 방식")
        payment_type_frame.grid(row=4, column=0, columnspan=2, padx=5, pady=5, sticky='ew')
        
        self.payment_type = tk.StringVar(value="full")
        ttk.Radiobutton(payment_type_frame, text="전체 월 임대료", 
                        variable=self.payment_type, 
                        value="full").pack(side='left', padx=10)
        ttk.Radiobutton(payment_type_frame, text="일할 계산 (말일 결제)", 
                        variable=self.payment_type, 
                        value="prorated").pack(side='left', padx=10)

        ttk.Label(parent, text="계약 만료일:").grid(row=5, column=0, padx=5, pady=5, sticky='e')
        end_date_frame = ttk.Frame(parent)
        end_date_frame.grid(row=5, column=1, padx=5, pady=5, sticky='w')
        
        self.contract_end_date = ttk.Entry(end_date_frame, width=15)
        self.contract_end_date.pack(side='left', padx=(0, 5))
        
        self.end_date_cal = DateEntry(end_date_frame, width=12, background='darkblue',
                                    foreground='white', borderwidth=2,
                                    date_pattern='yyyy-mm-dd',
                                    locale='ko_KR')
        self.end_date_cal.pack(side='left')
        self.end_date_cal.bind("<<DateEntrySelected>>", 
                             lambda e: self.contract_end_date.delete(0, tk.END) or 
                                     self.contract_end_date.insert(0, self.end_date_cal.get()))

        ttk.Button(parent, text="임대인 추가", command=self.add_tenant).grid(row=6, column=0, columnspan=2, pady=10)

    def create_add_payment_widgets(self, parent):
        ttk.Label(parent, text="건물 이름:").grid(row=0, column=0, padx=5, pady=5, sticky='e')
        self.add_payment_building_name = ttk.Combobox(parent, values=list(self.rental_manager.buildings.keys()))
        self.add_payment_building_name.grid(row=0, column=1, padx=5, pady=5)
        self.add_payment_building_name.bind("<<ComboboxSelected>>", self.update_add_payment_tenant_list)

        ttk.Label(parent, text="임대인 이름:").grid(row=1, column=0, padx=5, pady=5, sticky='e')
        self.add_payment_tenant_name = ttk.Combobox(parent, values=[])
        self.add_payment_tenant_name.grid(row=1, column=1, padx=5, pady=5)

        ttk.Label(parent, text="납부일:").grid(row=2, column=0, padx=5, pady=5, sticky='e')
        payment_date_frame = ttk.Frame(parent)
        payment_date_frame.grid(row=2, column=1, padx=5, pady=5, sticky='w')
        
        self.payment_date = ttk.Entry(payment_date_frame, width=15)
        self.payment_date.pack(side='left', padx=(0, 5))
        
        self.payment_date_cal = DateEntry(payment_date_frame, width=12, background='darkblue',
                                        foreground='white', borderwidth=2,
                                        date_pattern='yyyy-mm-dd',
                                        locale='ko_KR')
        self.payment_date_cal.pack(side='left')
        self.payment_date_cal.bind("<<DateEntrySelected>>", 
                                 lambda e: self.payment_date.delete(0, tk.END) or 
                                         self.payment_date.insert(0, self.payment_date_cal.get()))

        ttk.Label(parent, text="납부액:").grid(row=3, column=0, padx=5, pady=5, sticky='e')
        self.payment_amount = ttk.Entry(parent)
        self.payment_amount.grid(row=3, column=1, padx=5, pady=5)

        ttk.Button(parent, text="납부 기록 추가", command=self.add_payment).grid(row=4, column=0, columnspan=2, pady=10)

    def update_add_payment_tenant_list(self, event=None):
        """납부 추가 탭의 임대인 목록 업데이트"""
        building_name = self.add_payment_building_name.get()
        self.add_payment_tenant_name.set('')  # 존 선택 초화
        
        if building_name in self.rental_manager.buildings:
            tenant_names = sorted(self.rental_manager.buildings[building_name].keys())
            self.add_payment_tenant_name['values'] = tenant_names
        else:
            self.add_payment_tenant_name['values'] = []

    def add_payment(self):
        building_name = self.add_payment_building_name.get()
        tenant_name = self.add_payment_tenant_name.get()
        payment_date = self.payment_date.get()
        amount = self.payment_amount.get()
        
        if building_name and tenant_name and payment_date and amount:
            try:
                # 건물과 임대인이 존재하는지 먼저 확인
                if building_name not in self.rental_manager.buildings:
                    raise ValueError(f"건물 '{building_name}'이(가) 존재하지 않습니다.")
                if tenant_name not in self.rental_manager.buildings[building_name]:
                    raise ValueError(f"임대인 '{tenant_name}'이(가) 존재하지 않습니다.")
                
                self.rental_manager.add_payment(building_name, tenant_name, payment_date, amount)
                self.rental_manager.save_data()
                messagebox.showinfo("성공", f"{tenant_name}의 납부 기록이 추가되었습니다.")
                
                # 필드 초기화
                self.clear_payment_fields()
                
                # UI 업데이트
                self.update_tenant_listbox()
                self.update_building_listbox()
                self.update_unpaid_tree()
                self.update_stats()
                
                # 현재 보고서에 표시된 임대인의 납부 기록이 추가된 경우 보고서 갱신
                current_report_building = self.report_building_name.get()
                current_report_tenant = self.report_tenant_name.get()
                if (current_report_building == building_name and 
                    current_report_tenant == tenant_name):
                    self.show_report(building_name, tenant_name)
                
            except ValueError as e:
                messagebox.showerror("오류", str(e))
        else:
            messagebox.showerror("오류", "모든 필드를 입력해주세요.")

    def clear_payment_fields(self):
        """납부 기록 입력 필드 초기화"""
        self.add_payment_building_name.set('')
        self.add_payment_tenant_name.set('')
        self.payment_date.delete(0, tk.END)
        self.payment_amount.delete(0, tk.END)

    def create_view_report_widgets(self, parent):
        ttk.Label(parent, text="건물 이름:").grid(row=0, column=0, padx=5, pady=5, sticky='e')
        self.report_building_name = ttk.Combobox(parent, values=list(self.rental_manager.buildings.keys()))
        self.report_building_name.grid(row=0, column=1, padx=5, pady=5)
        self.report_building_name.bind("<<ComboboxSelected>>", self.update_report_tenant_list)

        ttk.Label(parent, text="임대인 이름:").grid(row=1, column=0, padx=5, pady=5, sticky='e')
        self.report_tenant_name = ttk.Combobox(parent, values=[])
        self.report_tenant_name.grid(row=1, column=1, padx=5, pady=5)
        self.report_tenant_name.bind("<<ComboboxSelected>>", self.on_report_tenant_selected)

        ttk.Button(parent, text="보고서 갱신", 
                   command=lambda: self.show_report(
                       self.report_building_name.get(), 
                       self.report_tenant_name.get()
                   )).grid(row=2, column=0, columnspan=2, pady=10)

        self.report_tree = ttk.Treeview(
            parent, 
            columns=('월', '임대료', '납부일자', '납부액', '잔액', '비고'), 
            show='headings'
        )
        self.report_tree.heading('월', text='월')
        self.report_tree.heading('임대료', text='임대료')
        self.report_tree.heading('납부일자', text='납부일자')
        self.report_tree.heading('납부액', text='납부액')
        self.report_tree.heading('잔액', text='잔액')
        self.report_tree.heading('비고', text='비고')
        
        # 각 컬럼의 너비 조정
        self.report_tree.column('월', width=80)
        self.report_tree.column('임대료', width=100)
        self.report_tree.column('납부일자', width=100)
        self.report_tree.column('납부액', width=100)
        self.report_tree.column('잔액', width=100)
        self.report_tree.column('비고', width=150)  # 수정된 부분
        
        self.report_tree.grid(row=3, column=0, columnspan=2, padx=5, pady=5, sticky='nsew')

        scrollbar = ttk.Scrollbar(parent, orient='vertical', command=self.report_tree.yview)
        scrollbar.grid(row=3, column=2, sticky='ns')
        self.report_tree.configure(yscrollcommand=scrollbar.set)

        parent.grid_rowconfigure(3, weight=1)
        parent.grid_columnconfigure(0, weight=1)
        parent.grid_columnconfigure(1, weight=1)

        ttk.Button(parent, text="엑셀 저장", command=self.save_to_excel).grid(row=4, column=0, pady=10)
        ttk.Button(parent, text="그래프 보기", command=self.show_graph).grid(row=4, column=1, pady=10)
        ttk.Button(parent, text="프린트 출력", command=lambda: self.print_report()).grid(row=4, column=2, pady=10)

    def create_manage_tenant_widgets(self, parent):
        main_frame = ttk.Frame(parent)
        main_frame.pack(fill='both', expand=True, padx=5, pady=5)

        left_frame = ttk.LabelFrame(main_frame, text="임대인 목록")
        left_frame.pack(side='left', fill='both', padx=5, pady=5)

        self.tenant_listbox = tk.Listbox(left_frame, width=25, height=15)
        self.tenant_listbox.pack(fill='both', expand=True, padx=5, pady=5)
        self.update_tenant_listbox()  # 임대인 목록 업데이트
        self.tenant_listbox.bind('<<ListboxSelect>>', self.show_tenant_info)  # 수정된 부분

        center_frame = ttk.LabelFrame(main_frame, text="임대인 정보")
        center_frame.pack(side='left', fill='both', expand=True, padx=5, pady=5)

        self.tenant_info_text = tk.Text(center_frame, height=5, width=35)
        self.tenant_info_text.pack(fill='x', padx=5, pady=5)

        edit_frame = ttk.LabelFrame(center_frame, text="정보 수정")
        edit_frame.pack(fill='x', padx=5, pady=5)

        edit_grid = ttk.Frame(edit_frame)
        edit_grid.pack(fill='x', padx=5, pady=5)

        ttk.Label(edit_grid, text="건물:").grid(row=0, column=0, padx=2, pady=2)
        self.edit_building_name = ttk.Combobox(edit_grid, width=20)
        self.edit_building_name['values'] = sorted(self.rental_manager.buildings.keys())
        self.edit_building_name.grid(row=0, column=1, padx=2, pady=2)

        ttk.Label(edit_grid, text="임대인 름:").grid(row=1, column=0, padx=2, pady=2)
        self.edit_tenant_name = ttk.Entry(edit_grid, width=20)
        self.edit_tenant_name.grid(row=1, column=1, padx=2, pady=2)

        ttk.Label(edit_grid, text="임대 시작일:").grid(row=2, column=0, padx=2, pady=2)
        self.edit_start_date = ttk.Entry(edit_grid, width=20)
        self.edit_start_date.grid(row=2, column=1, padx=2, pady=2)

        ttk.Label(edit_grid, text="월 임대료:").grid(row=3, column=0, padx=2, pady=2)
        self.edit_monthly_rent = ttk.Entry(edit_grid, width=20)
        self.edit_monthly_rent.grid(row=3, column=1, padx=2, pady=2)

        # 결제 방식 선택 프레임 추가
        payment_type_frame = ttk.LabelFrame(edit_grid, text="결제 방식")
        payment_type_frame.grid(row=4, column=0, columnspan=2, padx=2, pady=5, sticky='ew')
        
        self.edit_payment_type = tk.StringVar(value="full")
        ttk.Radiobutton(payment_type_frame, text="전체 월 임대료", 
                        variable=self.edit_payment_type, 
                        value="full").pack(side='left', padx=10)
        ttk.Radiobutton(payment_type_frame, text="일할 계산 (말일 결제)", 
                        variable=self.edit_payment_type, 
                        value="prorated").pack(side='left', padx=10)

        ttk.Label(edit_grid, text="계약 만료일:").grid(row=5, column=0, padx=2, pady=2)
        self.edit_contract_end_date = ttk.Entry(edit_grid, width=20)
        self.edit_contract_end_date.grid(row=5, column=1, padx=2, pady=2)

        button_frame = ttk.Frame(center_frame)
        button_frame.pack(fill='x', padx=5, pady=5)
        ttk.Button(button_frame, text="정보 수정", command=self.edit_tenant).pack(side='left', padx=2)
        ttk.Button(button_frame, text="임대인 삭제", style='Danger.TButton', command=self.delete_tenant).pack(side='left', padx=2)

        right_frame = ttk.LabelFrame(main_frame, text="임대료 수정")
        right_frame.pack(side='left', fill='both', padx=5, pady=5)

        override_grid = ttk.Frame(right_frame)
        override_grid.pack(fill='x', padx=5, pady=5)

        ttk.Label(override_grid, text="년월:").grid(row=0, column=0, padx=2, pady=2)
        override_date_frame = ttk.Frame(override_grid)
        override_date_frame.grid(row=0, column=1, padx=2, pady=2)
        
        self.override_date = ttk.Entry(override_date_frame, width=10)
        self.override_date.pack(side='left', padx=(0, 5))
        
        self.override_date_cal = DateEntry(override_date_frame, width=12, 
                                         background='darkblue',
                                         foreground='white', 
                                         borderwidth=2,
                                         date_pattern='yyyy-mm-dd',
                                         locale='ko_KR')  # locale 추가
        self.override_date_cal.pack(side='left')
        self.override_date_cal.bind("<<DateEntrySelected>>", 
                                  lambda e: self.override_date.delete(0, tk.END) or 
                                          self.override_date.insert(0, self.override_date_cal.get()[:7]))

        ttk.Label(override_grid, text="수정 임대료:").grid(row=1, column=0, padx=2, pady=2)
        self.override_amount = ttk.Entry(override_grid, width=15)
        self.override_amount.grid(row=1, column=1, padx=2, pady=2)

        ttk.Label(override_grid, text="수정 사유:").grid(row=2, column=0, padx=2, pady=2)
        self.override_note = ttk.Entry(override_grid, width=15)
        self.override_note.grid(row=2, column=1, padx=2, pady=2)

        ttk.Button(override_grid, text="임대료 수정", 
                   command=self.add_rent_override).grid(row=3, column=0, columnspan=2, pady=2)

        ttk.Label(right_frame, text="수정된 목록:").pack(padx=2, pady=2)
        self.override_listbox = tk.Listbox(right_frame, width=25, height=6)
        self.override_listbox.pack(fill='x', padx=5, pady=2)

        ttk.Button(right_frame, text="선택 항목 삭제", style='Danger.TButton', 
                   command=self.delete_rent_override).pack(pady=2)

        increase_frame = ttk.LabelFrame(right_frame, text="임대료 일괄 인상")
        increase_frame.pack(fill='x', padx=5, pady=5)

        increase_grid = ttk.Frame(increase_frame)
        increase_grid.pack(fill='x', padx=5, pady=5)

        ttk.Label(increase_grid, text="시작월:").grid(row=0, column=0, padx=2, pady=2)
        increase_date_frame = ttk.Frame(increase_grid)
        increase_date_frame.grid(row=0, column=1, padx=2, pady=2)
        
        self.increase_start_date = ttk.Entry(increase_date_frame, width=10)
        self.increase_start_date.pack(side='left', padx=(0, 5))
        
        self.increase_start_date_cal = DateEntry(increase_date_frame, width=12, 
                                               background='darkblue',
                                               foreground='white', 
                                               borderwidth=2,
                                               date_pattern='yyyy-mm-dd',
                                               locale='ko_KR')  # locale 추가
        self.increase_start_date_cal.pack(side='left')
        self.increase_start_date_cal.bind("<<DateEntrySelected>>", 
                                        lambda e: self.increase_start_date.delete(0, tk.END) or 
                                                self.increase_start_date.insert(0, self.increase_start_date_cal.get()))

        ttk.Label(increase_grid, text="인상액/율:").grid(row=1, column=0, padx=2, pady=2)
        self.increase_amount = ttk.Entry(increase_grid, width=15)
        self.increase_amount.grid(row=1, column=1, padx=2, pady=2)

        radio_frame = ttk.Frame(increase_frame)
        radio_frame.pack(fill='x', padx=5)
        
        self.increase_type = tk.StringVar(value="percentage")
        ttk.Radiobutton(radio_frame, text="퍼센트", variable=self.increase_type, 
                        value="percentage").pack(side='left', padx=2)
        ttk.Radiobutton(radio_frame, text="금액", variable=self.increase_type, 
                        value="amount").pack(side='left', padx=2)

        ttk.Button(increase_frame, text="일괄 인상", 
                   command=self.bulk_increase_rent).pack(pady=5)

        # 계약 연장 프레임 추가
        extension_frame = ttk.LabelFrame(right_frame, text="계약 연장")
        extension_frame.pack(fill='x', padx=5, pady=5)
        
        extension_grid = ttk.Frame(extension_frame)
        extension_grid.pack(fill='x', padx=5, pady=5)
        
        # 연장 기간 선택
        ttk.Label(extension_grid, text="연장 기간:").grid(row=0, column=0, padx=2, pady=2)
        self.extension_period = ttk.Spinbox(extension_grid, from_=1, to=5, width=5)
        self.extension_period.set(1)
        self.extension_period.grid(row=0, column=1, padx=2, pady=2)
        ttk.Label(extension_grid, text="년").grid(row=0, column=2, padx=2, pady=2)
        
        # 일할계산 적용 여부
        self.apply_prorated = tk.BooleanVar(value=False)
        ttk.Checkbutton(extension_grid, text="만료일 일할계산 적용", 
                        variable=self.apply_prorated).grid(row=1, column=0, columnspan=3, pady=5)
        
        ttk.Button(extension_grid, text="계약 연장", 
                   command=self.extend_contract).grid(row=2, column=0, columnspan=3, pady=5)

    def extend_contract(self):
        """계약 연장 처리"""
        selected_index = self.tenant_listbox.curselection()
        if not selected_index:
            messagebox.showerror("오류", "임대인을 선택해주세요.")
            return
        
        selected_tenant = self.tenant_listbox.get(selected_index)
        building_name, tenant_name = selected_tenant.split(" - ")
        tenant = self.rental_manager.buildings[building_name][tenant_name]
        
        if 'contract_end_date' not in tenant:
            messagebox.showerror("오류", "계약 만료일이 설정되지 않은 임대인입니다.")
            return
        
        try:
            # 연장 기간 가져오기
            extension_years = int(self.extension_period.get())
            
            # 현재 계약 만료일
            current_end_date = tenant['contract_end_date']
            
            # 새로운 계약 만료일 계산
            new_end_date = current_end_date.replace(year=current_end_date.year + extension_years)
            
            # 계약 만료일 업데이트
            tenant['contract_end_date'] = new_end_date
            
            # 데이터 저장 및 화면 갱신
            self.rental_manager.save_data()
            self.show_tenant_info(None)  # 임대인 정보 표시 갱신
            
            messagebox.showinfo("성공", 
                f"계약이 {extension_years}년 연장되었습니다.\n"
                f"새로운 만료일: {new_end_date}")
            
        except ValueError as e:
            messagebox.showerror("오류", f"계약 연장 중 오류가 발생했습니다: {str(e)}")

    def create_manage_payment_frame(self, parent):
        # 상단 프레임 추가
        top_frame = ttk.Frame(parent)
        top_frame.grid(row=0, column=0, columnspan=3, sticky='ew', padx=5, pady=5)

        ttk.Label(top_frame, text="건물 이름:").pack(side='left', padx=5)
        self.payment_building_name = ttk.Combobox(top_frame, values=list(self.rental_manager.buildings.keys()))
        self.payment_building_name.pack(side='left', padx=5)
        self.payment_building_name.bind("<<ComboboxSelected>>", self.update_payment_tenant_list)

        ttk.Label(top_frame, text="임대인 이름:").pack(side='left', padx=5)
        self.payment_tenant_name = ttk.Combobox(top_frame, values=[])
        self.payment_tenant_name.pack(side='left', padx=5)
        self.payment_tenant_name.bind("<<ComboboxSelected>>", self.update_payment_listbox)

        # 납부 기록 목록
        self.payment_listbox = tk.Listbox(parent, width=50, height=15)
        self.payment_listbox.grid(row=1, column=0, columnspan=2, padx=5, pady=5, sticky='nsew')

        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=self.payment_listbox.yview)
        scrollbar.grid(row=1, column=2, sticky='ns')
        self.payment_listbox.configure(yscrollcommand=scrollbar.set)

        # 버튼 프레임
        button_frame = ttk.Frame(parent)
        button_frame.grid(row=2, column=0, columnspan=3, pady=10)

        ttk.Button(button_frame, text="선택한 납부 기록 삭제", style='Danger.TButton', command=self.delete_payment).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="전체 납부 기록 삭제", style='Danger.TButton', command=self.delete_all_payments).pack(side=tk.LEFT, padx=5)

        parent.grid_columnconfigure(1, weight=1)
        parent.grid_rowconfigure(1, weight=1)

    def update_payment_tenant_list(self, event=None):
        """건물 선택 시 해당 건물의 임대인 목록 업데이트"""
        building_name = self.payment_building_name.get()
        self.payment_tenant_name.set('')  # 선택 초기화
        
        if building_name in self.rental_manager.buildings:
            # 해당 건물의 임대인 목을 가져와서 정렬
            tenant_names = sorted(self.rental_manager.buildings[building_name].keys())
            self.payment_tenant_name['values'] = tenant_names
            
            # 임대인이 있는 경우 첫 번째 임대인 선택
            if tenant_names:
                self.payment_tenant_name.set(tenant_names[0])
                self.update_payment_listbox()  # 선택된 임대인의 납부 기록 표시
        else:
            # 건물이 없는 경우 임대인 목록 비우기
            self.payment_tenant_name['values'] = []

    def update_payment_listbox(self, event=None):
        """임대인 선택 시 해당 임인의 납부 기록 업데이트"""
        building_name = self.payment_building_name.get()
        tenant_name = self.payment_tenant_name.get()
        
        self.payment_listbox.delete(0, tk.END)
        
        if building_name in self.rental_manager.buildings and tenant_name in self.rental_manager.buildings[building_name]:
            tenant = self.rental_manager.buildings[building_name][tenant_name]
            payments = sorted(tenant['payments'], key=lambda x: x['date'])
            
            for payment in payments:
                # 천단위 구분기호 추가하고 정수로 표시
                self.payment_listbox.insert(tk.END, f"{payment['date']}: {int(payment['amount']):,}원")
        else:
            messagebox.showerror("오류", "존재하지 않는 건물 또는 임대인입니다.")

    def delete_payment(self):
        """선택한 납부 기록 삭제"""
        selected_index = self.payment_listbox.curselection()
        if selected_index:
            building_name = self.payment_building_name.get()
            tenant_name = self.payment_tenant_name.get()
            
            if building_name in self.rental_manager.buildings and tenant_name in self.rental_manager.buildings[building_name]:
                tenant = self.rental_manager.buildings[building_name][tenant_name]
                payments = sorted(tenant['payments'], key=lambda x: x['date'])
                
                
                if 0 <= selected_index[0] < len(payments):
                    payment_to_delete = payments[selected_index[0]]
                    tenant['payments'].remove(payment_to_delete)
                    self.rental_manager.save_data()
                    self.update_payment_listbox()
                    self.update_dashboard()
                    messagebox.showinfo("", "납부 기록이 삭제되었습니다.")
                else:
                    messagebox.showerror("오류", "선택한 납부 기록이 없습니다.")
            else:
                messagebox.showerror("류", "존재하지 않는 건물 또는 임대인입니다.")
        else:
            messagebox.showerror("오류", "납부 기록을 선택해주세요.")

    def delete_all_payments(self):
        """전체 납부 기록 제"""
        building_name = self.payment_building_name.get()
        tenant_name = self.payment_tenant_name.get()
        
        if building_name in self.rental_manager.buildings and tenant_name in self.rental_manager.buildings[building_name]:
            tenant = self.rental_manager.buildings[building_name][tenant_name]
            tenant['payments'] = []
            self.rental_manager.save_data()
            self.update_payment_listbox()
            self.update_dashboard()
            messagebox.showinfo("성공", "모든 납부 기록이 삭제되었습니다.")
        else:
            messagebox.showerror("오류", "존재하지 않는 건물 또는 임대인입니.")

    def update_dashboard(self):
        self.update_tenant_listbox()
        self.update_building_listbox()
        self.update_unpaid_tree()
        self.update_stats()

    def update_tenant_listbox(self):
        self.tenant_listbox.delete(0, tk.END)
        for building, tenants in self.rental_manager.buildings.items():
            for tenant in tenants:
                self.tenant_listbox.insert(tk.END, f"{building} - {tenant}")

    def show_tenant_info(self, event):
        selected_index = self.tenant_listbox.curselection()
        if selected_index:
            selected_tenant = self.tenant_listbox.get(selected_index)
            building_name, tenant_name = selected_tenant.split(" - ")
            
            tenant_info = self.rental_manager.buildings[building_name][tenant_name]
            info_text = (f"건물: {building_name}\n"
                        f"임대인: {tenant_name}\n"
                        f"시작일: {tenant_info['start_date']}\n"
                        f"월 임대료: {int(tenant_info['monthly_rent']):,}원\n"
                        f"결제 방식: {'일할 계산 (말일 결제)' if tenant_info.get('payment_type') == 'prorated' else '전체 월 임대료'}")
            
            if 'contract_end_date' in tenant_info:
                info_text += f"\n계약 만료일: {tenant_info['contract_end_date']}"
            
            self.tenant_info_text.delete(1.0, tk.END)
            self.tenant_info_text.insert(tk.END, info_text)
            
            self.edit_building_name.set(building_name)
            self.edit_tenant_name.delete(0, tk.END)
            self.edit_tenant_name.insert(0, tenant_name)
            self.edit_start_date.delete(0, tk.END)
            self.edit_start_date.insert(0, tenant_info['start_date'])
            self.edit_monthly_rent.delete(0, tk.END)
            self.edit_monthly_rent.insert(0, int(tenant_info['monthly_rent']))
            self.edit_payment_type.set(tenant_info.get('payment_type', 'full'))
            self.edit_contract_end_date.delete(0, tk.END)
            if 'contract_end_date' in tenant_info:
                self.edit_contract_end_date.insert(0, tenant_info['contract_end_date'])
            
            self.update_override_listbox(building_name, tenant_name)

    def edit_tenant(self):
        selected_index = self.tenant_listbox.curselection()
        if selected_index:
            selected_tenant = self.tenant_listbox.get(selected_index)
            building_name, tenant_name = selected_tenant.split(" - ")
            
            new_building_name = self.edit_building_name.get()
            new_tenant_name = self.edit_tenant_name.get()
            new_start_date = self.edit_start_date.get()
            new_monthly_rent = self.edit_monthly_rent.get()
            new_payment_type = self.edit_payment_type.get()
            new_contract_end_date = self.edit_contract_end_date.get()
            
            if new_building_name and new_tenant_name and new_start_date and new_monthly_rent:
                try:
                    new_start_date = datetime.strptime(new_start_date, '%Y-%m-%d').date()
                    new_monthly_rent = float(new_monthly_rent)
                    if new_contract_end_date:
                        new_contract_end_date = datetime.strptime(new_contract_end_date, '%Y-%m-%d').date()
                    
                    if new_building_name != building_name or new_tenant_name != tenant_name:
                        if new_building_name not in self.rental_manager.buildings:
                            self.rental_manager.add_building(new_building_name)
                        
                        if new_tenant_name in self.rental_manager.buildings[new_building_name]:
                            messagebox.showerror("오류", "이미 존재하는 임대인 이름입니다.")
                            return
                        
                        tenant_data = self.rental_manager.buildings[building_name].pop(tenant_name)
                        tenant_data['start_date'] = new_start_date
                        tenant_data['monthly_rent'] = new_monthly_rent
                        tenant_data['payment_type'] = new_payment_type
                        self.rental_manager.buildings[new_building_name][new_tenant_name] = tenant_data
                        
                        if not self.rental_manager.buildings[building_name]:
                            del self.rental_manager.buildings[building_name]
                    else:
                        self.rental_manager.buildings[building_name][tenant_name]['start_date'] = new_start_date
                        self.rental_manager.buildings[building_name][tenant_name]['monthly_rent'] = new_monthly_rent
                        self.rental_manager.buildings[building_name][tenant_name]['payment_type'] = new_payment_type
                        
                    if new_contract_end_date:
                        self.rental_manager.buildings[new_building_name][new_tenant_name]['contract_end_date'] = new_contract_end_date
                    elif 'contract_end_date' in self.rental_manager.buildings[new_building_name][new_tenant_name]:
                        del self.rental_manager.buildings[new_building_name][new_tenant_name]['contract_end_date']
                    
                    self.rental_manager.save_data()
                    self.update_dashboard()
                    messagebox.showinfo("성공", "임대인 정보가 수정되었습니다.")
                except ValueError:
                    messagebox.showerror("오류", "날짜 형식(YYYY-MM-DD) 또는 금액이 올바르지 않습니다.")
            else:
                messagebox.showerror("오류", "모든 필드를 입력해주세요.")

    def delete_tenant(self):
        selected_index = self.tenant_listbox.curselection()
        if selected_index:
            selected_tenant = self.tenant_listbox.get(selected_index)
            building_name, tenant_name = selected_tenant.split(" - ")
            
            if building_name in self.rental_manager.buildings and tenant_name in self.rental_manager.buildings[building_name]:
                del self.rental_manager.buildings[building_name][tenant_name]
                if not self.rental_manager.buildings[building_name]:
                    del self.rental_manager.buildings[building_name]
                self.rental_manager.save_data()
                self.update_dashboard()
                messagebox.showinfo("성공", "임대인이 삭제되었습니다.")
            else:
                messagebox.showerror("오류", "존재하지 않는 건물 또는 임대인입니다.")

    def update_override_listbox(self, building_name, tenant_name):
        self.override_listbox.delete(0, tk.END)
        if 'monthly_rent_overrides' in self.rental_manager.buildings[building_name][tenant_name]:
            for date, info in self.rental_manager.buildings[building_name][tenant_name]['monthly_rent_overrides'].items():
                amount = info['amount'] if isinstance(info, dict) else info
                note = info.get('note', '') if isinstance(info, dict) else ''
                display_text = f"{date}: {int(amount):,}원"
                if note:
                    display_text += f" ({note})"
                self.override_listbox.insert(tk.END, display_text)

    def add_rent_override(self):
        selected_index = self.tenant_listbox.curselection()
        if selected_index:
            selected_tenant = self.tenant_listbox.get(selected_index)
            building_name, tenant_name = selected_tenant.split(" - ")
            
            override_date = self.override_date.get()
            override_amount = self.override_amount.get()
            override_note = self.override_note.get()  # 비고 가져오기
            
            if override_date and override_amount:
                try:
                    # YYYY-MM 형식으로 입력받아 날짜 객체로 변환
                    year, month = map(int, override_date.split('-'))
                    override_date = date(year, month, 1)  # 항상 1일로 설정
                    override_amount = float(override_amount)
                    
                    # 비고와 함께 임대료 수정 정보 저장
                    self.rental_manager.add_monthly_rent_override(
                        building_name, tenant_name, override_date, override_amount, override_note)
                    
                    self.rental_manager.save_data()
                    self.update_override_listbox(building_name, tenant_name)
                    self.update_dashboard()
                    messagebox.showinfo("성공", "임대료가 수정되었습니다.")
                except ValueError:
                    messagebox.showerror("오류", "날짜 형식(YYYY-MM) 또는 금액이 올바르지 않습니다.")
            else:
                messagebox.showerror("오류", "날짜와 금액을 입력해주세요.")

    def delete_rent_override(self):
        # 임대료 수정 목록에서 선택된 항목 확인
        override_selected = self.override_listbox.curselection()
        
        if not override_selected:
            messagebox.showerror("오류", "삭제할 임대료 수정 항목을 선택해주세요.")
            return
        
        try:
            selected_override = self.override_listbox.get(override_selected)
            
            # 날짜 추출 (비고가 있는 경우도 처리)
            date = selected_override.split(": ")[0]
            
            # 현재 선택된 임대인 정보 가져오기
            tenant_info = self.tenant_info_text.get(1.0, tk.END).strip().split('\n')
            building_name = tenant_info[0].split(': ')[1]
            tenant_name = tenant_info[1].split(': ')[1]
            
            # 조건문의 괄호 닫기 정
            if ('monthly_rent_overrides' in self.rental_manager.buildings[building_name][tenant_name] and 
                    date in self.rental_manager.buildings[building_name][tenant_name]['monthly_rent_overrides']):
                
                # 해당 임대료 수정 삭제
                del self.rental_manager.buildings[building_name][tenant_name]['monthly_rent_overrides'][date]
                
                # 데이터 저장 및 화면 갱신
                self.rental_manager.save_data()
                self.update_override_listbox(building_name, tenant_name)
                self.update_dashboard()
                messagebox.showinfo("성공", "임대료 수정이 삭제되었습니다.")
            else:
                messagebox.showerror("오류", "존재하지 않는 임대료 수정입니다.")
            
        except Exception as e:
            messagebox.showerror("오류", f"임대료 수정 삭제 중 오류가 발생했습니다: {str(e)}")

    def bulk_increase_rent(self):
        selected_index = self.tenant_listbox.curselection()
        if selected_index:
            selected_tenant = self.tenant_listbox.get(selected_index)
            building_name, tenant_name = selected_tenant.split(" - ")
            
            start_date = self.increase_start_date.get()
            increase_amount = self.increase_amount.get()
            is_percentage = self.increase_type.get() == "percentage"
            
            if start_date and increase_amount:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                    increase_amount = float(increase_amount)
                    self.rental_manager.bulk_rent_increase(building_name, tenant_name, start_date, increase_amount, is_percentage)
                    self.rental_manager.save_data()
                    self.update_override_listbox(building_name, tenant_name)
                    self.update_dashboard()
                    messagebox.showinfo("성공", "임대료가 일괄 인상되었습니다.")
                except ValueError:
                    messagebox.showerror("오류", "날짜 형식(YYYY-MM-DD) 또는 금액이 올바르지 않습니다.")
            else:
                messagebox.showerror("오류", "모든 필드를 입력해주세요.")

    def update_unpaid_tree(self):
        self.unpaid_tree.delete(*self.unpaid_tree.get_children())
        today = datetime.now().date()
        for building, tenants in self.rental_manager.buildings.items():
            for tenant, info in tenants.items():
                balance = self.rental_manager.calculate_balance(building, tenant)
                if balance > 0:
                    # 천단위 구분기호 추가하고 정수로 표시
                    self.unpaid_tree.insert("", "end", values=(f"{building} - {tenant}", f"{int(balance):,}원"))

    def update_stats(self):
        total_tenants = sum(len(tenants) for tenants in self.rental_manager.buildings.values())  # 괄호 닫기 추가
        self.total_tenants_label.config(text=str(total_tenants))
        
        monthly_total = 0
        for building, tenants in self.rental_manager.buildings.items():
            for tenant, info in tenants.items():
                monthly_total += info['monthly_rent']
        # 천단위 구분기호 추가하고 정수로 표시
        self.monthly_total_label.config(text=f"{int(monthly_total):,}원")
        
        total_unpaid = 0
        for building, tenants in self.rental_manager.buildings.items():
            for tenant, info in tenants.items():
                balance = self.rental_manager.calculate_balance(building, tenant)
                if balance > 0:
                    total_unpaid += balance
        # 천단위 구분기호 추가하고 정수로 표시
        self.total_unpaid_label.config(text=f"{int(total_unpaid):,}원")

    def update_report_tenant_list(self, event=None):
        """건물 선택 시 해당 건물의 임대인 목록 업데이트"""
        building_name = self.report_building_name.get()
        self.report_tenant_name.set('')  # 기존 선택 초기화
        
        if building_name in self.rental_manager.buildings:
            tenant_names = sorted(self.rental_manager.buildings[building_name].keys())
            self.report_tenant_name['values'] = tenant_names
            if tenant_names:
                self.report_tenant_name.set(tenant_names[0])
                # 첫 번째 임대인 선택 시 보고서 생성
                self.show_report(building_name, tenant_names[0])
        else:
            self.report_tenant_name['values'] = []

    def on_report_tenant_selected(self, event):
        """임대인이 선택되었을 때 보고서를 생성하고 표시"""
        building_name = self.report_building_name.get()
        tenant_name = self.report_tenant_name.get()
        if building_name and tenant_name:
            try:
                self.show_report(building_name, tenant_name)
            except Exception as e:
                messagebox.showerror("오류", f"보고서 생성 중 오류가 발생했습니다: {str(e)}")

    def show_report(self, building_name, tenant_name):
        """보고서 생성 및 표시"""
        try:
            # 트리뷰 초기화
            self.report_tree.delete(*self.report_tree.get_children())
            
            # 보고서 데이터 생성
            df = self.rental_manager.generate_report(building_name, tenant_name)
            if df is not None:
                # 데이터 추가
                for _, row in df.iterrows():
                    values = (
                        row['월'],
                        row['임대료'],
                        row['납부일자'] if pd.notna(row['납부일자']) else '',  # 한글 인코딩 수정
                        row['납부액'],
                        row['잔액'],
                        row['비고'] if pd.notna(row['비고']) else ''
                    )
                    self.report_tree.insert("", "end", values=values)
        except Exception as e:
            messagebox.showerror("오류", f"보고서 생성 중 오류가 발생했습니다: {str(e)}")
            print(f"보고서 생성 오류 상세: {str(e)}")  # 디버깅을 위한 출력 추가

    def update_report_tree(self, df):
        """보고서 트리뷰 업데이트"""
        try:
            self.report_tree.delete(*self.report_tree.get_children())
            for _, row in df.iterrows():
                values = (
                    row['월'],
                    row['임대료'],
                    row['납부일자'] if pd.notna(row['납부일자']) else '',
                    row['납부액'],
                    row['잔액'],
                    row['비고'] if pd.notna(row['비고']) else ''
                )
                self.report_tree.insert("", "end", values=values)
        except Exception as e:
            print(f"보고서 트리 업데이트 중 오류: {str(e)}")

    def save_to_excel(self):
        building_name = self.report_building_name.get()
        tenant_name = self.report_tenant_name.get()
        
        if not building_name or not tenant_name:
            messagebox.showerror("오류", "건물과 임대인을 선택해주세요.")
            return
        
        try:
            # 현재 트리뷰의 데이터를 데이터프레임으로 변환
            data = []
            for item in self.report_tree.get_children():
                values = self.report_tree.item(item)['values']
                data.append(values)
            
            df = pd.DataFrame(data, columns=['월', '임대료', '납부일자', '납부액', '잔액', '비고'])
            
            file_path = filedialog.asksaveasfilename(
                defaultextension=".xlsx",
                filetypes=[("Excel files", "*.xlsx")],
                initialfile=f"{building_name}_{tenant_name}_임대료납부현황.xlsx"  # 파일명 수정
            )
            
            if file_path:
                df.to_excel(file_path, index=False)
                messagebox.showinfo("성공", "보고서가 엑셀 파일로 저장되었습니다.")
                
        except Exception as e:
            messagebox.showerror("오류", f"엑셀 저장 중 오류가 발생했습니다: {str(e)}")

    def show_graph(self):
        building_name = self.report_building_name.get()
        tenant_name = self.report_tenant_name.get()
        
        if not building_name or not tenant_name:
            messagebox.showerror("오류", "건물과 대인을 선택해주세요.")
            return
        
        try:
            # 현재 트리뷰의 데이터를 데이터프레임으로 변환
            data = []
            for item in self.report_tree.get_children():
                values = self.report_tree.item(item)['values']
                data.append(values)
            
            df = pd.DataFrame(data, columns=['월', '임대료', '납부일자', '납부액', '잔액', '비고'])
            
            # 금액 데이터 전처리
            df['임대료'] = df['임대료'].str.replace('원', '').str.replace(',', '').astype(float)
            df['납부액'] = df['납부액'].apply(lambda x: 0 if x == '-' else float(x.replace('원', '').replace(',', '')))
            df['잔액'] = df['잔액'].str.replace('원', '').str.replace(',', '').astype(float)
            
            self.plot_graph(df)
            
        except Exception as e:
            messagebox.showerror("오류", f"그래프 생성 중 오류가 발생했습니다: {str(e)}")

    def print_report(self):
        building_name = self.report_building_name.get()
        tenant_name = self.report_tenant_name.get()
        
        if not building_name or not tenant_name:
            messagebox.showerror("오류", "건물과 임대인을 선택해주세요.")
            return
        
        try:
            # 현재 트리뷰의 데이터를 데이터프레임으로 변환
            data = []
            for item in self.report_tree.get_children():
                values = self.report_tree.item(item)['values']
                data.append(values)
            
            df = pd.DataFrame(data, columns=['월', '임대료', '납부일자', '납부액', '잔액', '비고'])
            
            # HTML 스타일 정의
            html_style = """
            <style>
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid black; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                .title { text-align: center; font-size: 20px; margin-bottom: 20px; }
            </style>
            """
            
            # 보고서 제목
            title = f"<div class='title'>{building_name} - {tenant_name} 임대료 납부현황</div>"
            
            # 데이터프레임을 HTML로 변환
            html_table = df.to_html(classes='table', index=False)
            
            # 전체 HTML 문서 생성
            full_html = f"<html><head><meta charset='utf-8'>{html_style}</head><body>{title}{html_table}</body></html>"
            
            self.print_html(full_html)
            
        except Exception as e:
            messagebox.showerror("오류", f"프린트 중 오류가 발생했습니다: {str(e)}")

    def plot_graph(self, df):
        try:
            # 한글 폰트 설정
            plt.rcParams['font.family'] = 'Malgun Gothic'
            plt.rcParams['axes.unicode_minus'] = False
            
            # 새 창 생성
            graph_window = tk.Toplevel(self)
            graph_window.title(f"{self.report_building_name.get()} - {self.report_tenant_name.get()} 임대료 납부현황")  # 창 제목 수정
            graph_window.geometry("1000x700")  # 창 크기 증가

            # 그래프 생성
            fig, ax = plt.subplots(figsize=(12, 7))  # 그래프 크기 증가
            
            # x축 데이터 준비
            x = range(len(df['월']))
            
            # 데이터 플로팅
            line_width = 2
            marker_size = 8
            
            # 임대료 선 그래프
            rent_line = ax.plot(x, df['임대료'], 
                              marker='o', 
                              label='임대료', 
                              color='#3498db',  # 파란색
                              linewidth=line_width,
                              markersize=marker_size,
                              linestyle='-')
            
            # 납부액 선 그래프
            payment_line = ax.plot(x, df['납부액'], 
                                 marker='s', 
                                 label='납부액', 
                                 color='#2ecc71',  # 초록색
                                 linewidth=line_width,
                                 markersize=marker_size,
                                 linestyle='-')
            
            # 잔액 선 그래프
            balance_line = ax.plot(x, df['잔액'], 
                                 marker='^', 
                                 label='잔액', 
                                 color='#e74c3c',  # 빨간색
                                 linewidth=line_width,
                                 markersize=marker_size,
                                 linestyle='-')
            
            # 그래프 스타일링
            ax.set_title(f'{self.report_building_name.get()} - {self.report_tenant_name.get()}\n임대료 납부현황', 
                        pad=20, 
                        fontsize=14, 
                        fontweight='bold')
            
            ax.set_xlabel('월', fontsize=12, labelpad=10)
            ax.set_ylabel('금액(원)', fontsize=12, labelpad=10)
            
            # 그리드 스타일 설정
            ax.grid(True, linestyle='--', alpha=0.7, color='#ecf0f1')
            ax.set_axisbelow(True)  # 그리드를 데이터 선 아래로
            
            # 범례 설정
            ax.legend(fontsize=12, 
                     loc='upper left', 
                     bbox_to_anchor=(1, 1),
                     frameon=True,
                     facecolor='white',
                     edgecolor='#bdc3c7')
            
            # x축 레이블 설정
            plt.xticks(x, df['월'], rotation=45, ha='right')
            
            # y축 눈금 포맷 (천단위 구분기호)
            ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: format(int(x), ',')))
            
            # 배경색 설정
            ax.set_facecolor('white')
            fig.patch.set_facecolor('white')
            
            # 여백 조정
            plt.tight_layout()
            
            # 그프를 Tkinter 에 삽입
            canvas = FigureCanvasTkAgg(fig, master=graph_window)
            canvas.draw()
            canvas.get_tk_widget().pack(fill='both', expand=True, padx=10, pady=10)
            
            # 창 크기 조절 가능하도록 설정
            graph_window.resizable(True, True)
            
        except Exception as e:
            messagebox.showerror("오류", f"그래프 생성 중 오류가 발생했습니다: {str(e)}")
            print(f"그래프 오류 상세: {str(e)}")

    def print_html(self, html):
        """HTML 문자열을 프린트"""
        try:
            # HTML 문열을 임시 파일에 저장
            with tempfile.NamedTemporaryFile(delete=False, suffix=".html", mode='w', encoding='utf-8') as temp:
                temp.write(html)
                temp_filename = temp.name
            
            # 기본 웹 브라우저로 HTML 파일 열기
            webbrowser.open('file://' + temp_filename)
            
            # 사용자에게 안내 메시지 표시
            messagebox.showinfo("안내", 
                "브라우저에서 프린트 창이 열렸습니다.\n"
                "브라우저의 프린트 기능을 사용하여 출력해주세요.\n"
                "출력이 완료되면 브라우저 창을 닫���시면 됩니다.")
                
        except Exception as e:
            messagebox.showerror("오류", f"프린트 중 오류가 발생했습니다: {str(e)}")
        finally:
            # 잠시 대기 후 임 파일 삭제
            try:
                time.sleep(1)  # 브라우저가 파일을 읽을 시간을 줌
                if 'temp_filename' in locals():
                    os.remove(temp_filename)
            except:
                pass  # 파일 삭제 실패 시 무시

if __name__ == "__main__":
    app = RentalApp()
    app.mainloop()

