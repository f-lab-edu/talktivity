import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불정책 | 톡티비티",
  description: "톡티비티 크레딧 환불 기준과 요청 방법 안내",
};

export default function RefundPage() {
  return (
    <article className="legal-page">
      <h1>환불정책</h1>
      <p className="legal-date">시행일: 2026-11-21</p>
      <section>
        <h2>1. 결제 처리</h2>
        <p>
          모든 결제는 Paddle.com이 처리하며, 환불금은 Paddle을 통해 원래 결제 수단으로 반환됩니다.
        </p>
      </section>
      <section>
        <h2>2. 환불 기준</h2>
        <ul>
          <li>구매 후 14일 이내에 사용하지 않은 크레딧은 전액 환불합니다.</li>
          <li>리포트 생성에 이미 사용한 크레딧은 환불되지 않습니다.</li>
          <li>리포트 생성이 실패하면 크레딧이 차감되지 않습니다.</li>
        </ul>
      </section>
      <section>
        <h2>3. 환불 요청 방법</h2>
        <p>
          <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>로 요청하시거나 Paddle이 보낸
          영수증의 링크를 통해 요청할 수 있습니다.
        </p>
      </section>
    </article>
  );
}
