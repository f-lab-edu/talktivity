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
          모든 결제는 Paddle.com이 처리합니다. 주문 절차는 온라인 재판매자(reseller)인 Paddle.com이
          수행하며, Paddle.com이 모든 주문의 판매기록자(Merchant of Record)입니다. Paddle의{" "}
          <a
            href="https://www.paddle.com/legal/refund-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            환불정책
          </a>
          이 함께 적용되며, 환불금은 원래 결제수단으로 반환됩니다.
        </p>
      </section>
      <section>
        <h2>2. 사용하지 않은 크레딧</h2>
        <p>
          구매일부터 7일 이내에 사용하지 않은 크레딧은 전액 환불합니다(전자상거래 등에서의
          소비자보호에 관한 법률 제17조 제1항).
        </p>
      </section>
      <section>
        <h2>3. 리포트 생성에 사용한 크레딧</h2>
        <ul>
          <li>
            리포트 생성에 사용한 크레딧은 디지털콘텐츠의 제공이 개시되어 청약철회가 제한됩니다(같은
            법 제17조 제2항 제5호). 무료 분석으로 서비스를 미리 체험할 수 있습니다.
          </li>
          <li>
            다만 제공된 내용이 표시·광고 또는 계약 내용과 다르거나 오류로 이용할 수 없는 경우에는
            공급받은 날부터 3개월, 그 사실을 안 날부터 30일 이내에 환불을 요청할 수 있습니다(같은 법
            제17조 제3항).
          </li>
          <li>리포트 생성에 실패하면 크레딧은 차감되지 않습니다.</li>
        </ul>
      </section>
      <section>
        <h2>4. 환불 요청 방법</h2>
        <p>
          <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">
            paddle.net
          </a>{" "}
          또는 Paddle이 보낸 영수증의 링크를 통해 요청하거나,{" "}
          <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>로 요청할 수 있습니다.
        </p>
      </section>
    </article>
  );
}
