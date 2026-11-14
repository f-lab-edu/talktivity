"use client";

import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingStep({ onStart, onExample }: { readonly onStart: () => void; readonly onExample: () => void }) {
  return <section className="landing">
    <div className="eyebrow"><span className="live-dot" /> 내 카톡엔 어떤 내가 숨어 있을까?</div>
    <h1>카톡 대화<br /><span className="title-accent">팩폭 분석기</span><span className="title-period">.</span></h1>
    <p className="landing-subtitle">스레드/릴스 화제의 카톡 심리 테스트!<br />3초 만에 보는 내 톡 성향</p>
    <div className="chat-art" aria-hidden="true">
      <div className="art-caption"><Sparkles size={15} /> 말투는 못 숨기지</div>
      <div className="chat-bubble bubble-in">답장 기다리는 거 아니고<br />그냥 폰 보고 있던 건데?</div>
      <div className="chat-bubble bubble-out">근데 왜 1 사라지자마자 답장해 ㅋㅋ</div>
      <div className="character-orbit"><MessageCircle size={46} strokeWidth={1.5} /><span>나의 톡 캐릭터는?</span></div>
      <div className="art-sticker">읽었습니다.<br /><strong>마음까지.</strong></div>
    </div>
    <div className="landing-bottom-note"><span>12가지 톡 캐릭터</span><i /> 가입 없이 무료<i /><span>대화 저장 안 함</span></div>
    <div className="landing-actions">
      <Button onClick={onStart}>무료로 내 톡 팩폭 보기 <ArrowRight size={18} /><small>(가입 없이 3초 소요)</small></Button>
      <Button variant="ghost" onClick={onExample}>예시 대화로 1초 만에 테스트하기 <ArrowRight size={15} /></Button>
    </div>
  </section>;
}
