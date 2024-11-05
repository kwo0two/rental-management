import datetime

class RentalManagement:
    def __init__(self):
        self.tenants = {}

    def add_tenant(self, name, start_date, monthly_rent):
        self.tenants[name] = {
            'start_date': datetime.datetime.strptime(start_date, '%Y-%m-%d').date(),
            'monthly_rent': monthly_rent,
            'payments': []
        }
        print(f"임대인 {name}이(가) 추가되었습니다.")

    def add_payment(self, name, payment_date, amount):
        if name not in self.tenants:
            print("해당 임대인이 존재하지 않습니다.")
            return
        payment_date = datetime.datetime.strptime(payment_date, '%Y-%m-%d').date()
        self.tenants[name]['payments'].append({'date': payment_date, 'amount': amount})
        print(f"{name}의 납부 기록이 추가되었습니다.")

    # 다른 메서드들도 비슷하게 구현합니다...

def main():
    rental_manager = RentalManagement()
    
    while True:
        print("\n1. 임대인 추가")
        print("2. 납부 기록 추가")
        print("3. 잔액 계산")
        print("4. 보고서 생성")
        print("5. 종료")
        
        choice = input("선택하세요: ")
        
        if choice == '1':
            name = input("임대인 이름: ")
            start_date = input("임대 시작일 (YYYY-MM-DD): ")
            monthly_rent = float(input("월 임대료: "))
            rental_manager.add_tenant(name, start_date, monthly_rent)
        elif choice == '2':
            name = input("임대인 이름: ")
            payment_date = input("납부일 (YYYY-MM-DD): ")
            amount = float(input("납부액: "))
            rental_manager.add_payment(name, payment_date, amount)
        elif choice == '3':
            name = input("임대인 이름: ")
            balance = rental_manager.calculate_balance(name)
            print(f"{name}의 현재 잔액: {balance}")
        elif choice == '4':
            name = input("임대인 이름: ")
            rental_manager.generate_report(name)
        elif choice == '5':
            print("프로그램을 종료합니다.")
            break
        else:
            print("잘못된 선택입니다. 다시 선택해주세요.")

if __name__ == "__main__":
    main()

