'use client';

import { motion, type TargetAndTransition } from 'framer-motion';

// 스크롤 진입 시 브릭이 화면 밖(좌·우·하단)에서 슬라이드 인. 각 요소가 뷰포트에 들어올 때
// 개별 발화하므로 섹션이 길면 자연스러운 스태거가 된다. (섹션에 overflow-hidden 필요)
const EASE = [0.16, 1, 0.3, 1] as const;
const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' };
const TRANS = { duration: 0.7, ease: EASE };

type Anim = { initial: TargetAndTransition; animate: TargetAndTransition };
const fromLeft: Anim = { initial: { x: -180, opacity: 0 }, animate: { x: 0, opacity: 1 } };
const fromRight: Anim = { initial: { x: 180, opacity: 0 }, animate: { x: 0, opacity: 1 } };
const fromBottom: Anim = { initial: { y: 130, opacity: 0 }, animate: { y: 0, opacity: 1 } };

function Brick({ className, anim }: { className: string; anim: Anim }) {
  return (
    <motion.div
      className={className}
      initial={anim.initial}
      whileInView={anim.animate}
      viewport={VIEWPORT}
      transition={TRANS}
    />
  );
}

const TAG_STYLE = { color: '#ffffff' };
const CIRCLE_STYLE = { backgroundColor: '#ffffff' };

export function MissionBricks() {
  return (
    <div className="casestudy-text--list">
      <div className="mission-top_block">
        <div className="mission-top_flex">
          <Brick className="mission-top_left" anim={fromLeft} />
          <Brick className="mission-top_right" anim={fromRight} />
        </div>
        <div className="mission-top_flex">
          <Brick className="mission-top_left cc-wide" anim={fromLeft} />
          <Brick className="mission-top_right cc-wide" anim={fromRight} />
        </div>
      </div>

      {/* 블록 1 — 이용 안내 */}
      <div>
        <div className="mission-block">
          <Brick className="mission-left_block cc-heading" anim={fromLeft} />
          <motion.div
            className="mission-block_tag"
            style={TAG_STYLE}
            initial={fromLeft.initial}
            whileInView={fromLeft.animate}
            viewport={VIEWPORT}
            transition={TRANS}
          >
            <div>이용 안내</div>
            <div className="tag-circle cc-green" style={CIRCLE_STYLE} />
          </motion.div>
          <div className="margin-right_block">
            <Brick className="mission-right_inner cc-hide-mobile" anim={fromRight} />
            <Brick className="mission-right_inner" anim={fromRight} />
            <Brick className="mission-right_inner cc-right" anim={fromRight} />
          </div>
        </div>
        <div className="mission-inner_block">
          <div className="mission-left_container">
            <Brick className="mission-left_block cc-vertical" anim={fromLeft} />
            <Brick className="mission-left_block cc-vertical" anim={fromLeft} />
            <Brick className="mission-left_block cc-vertical" anim={fromLeft} />
            <Brick className="mission-left_block cc-vertical cc-hide-desktop" anim={fromLeft} />
          </div>
          <motion.div
            className="mission-text_container"
            initial={fromBottom.initial}
            whileInView={fromBottom.animate}
            viewport={VIEWPORT}
            transition={TRANS}
          >
            <p>
              매주 금·토요일 운영합니다. 1부 17:00~19:00 / 2부 19:30~21:30, 회차당 2시간이며 전액
              선결제로 예약이 확정됩니다.
            </p>
            <p>
              모든 상품에 고기세트(정원 기준 1인 150g)가 포함되고, 숯·석쇠·집게·식기·생수 등 기본
              세팅과 상추·양파·버섯·소시지·쌈장 등 기본 식재료, 커피 쿠폰이 무료로 제공됩니다.
            </p>
            <p>
              한강라면·햇반은 정원 수만큼 제공되며, 라면·햇반 개수 구성은 택 1로 선택하실 수
              있습니다.
            </p>
            <p>현장에서는 물(수도)을 사용할 수 없는 점 참고 부탁드립니다.</p>
          </motion.div>
          <div className="mission-left_container">
            <Brick className="mission-right_block cc-vertical" anim={fromRight} />
            <Brick className="mission-right_block cc-vertical" anim={fromRight} />
            <Brick className="mission-right_block cc-vertical" anim={fromRight} />
            <Brick className="mission-right_block cc-vertical cc-hide-desktop" anim={fromRight} />
          </div>
        </div>
      </div>

      {/* 블록 2 — 환불 규정 */}
      <div>
        <div className="mission-block">
          <Brick className="mission-left_block cc-heading" anim={fromLeft} />
          <motion.div
            className="mission-block_tag cc-light-green"
            style={TAG_STYLE}
            initial={fromLeft.initial}
            whileInView={fromLeft.animate}
            viewport={VIEWPORT}
            transition={TRANS}
          >
            <div>환불 규정</div>
            <div className="tag-circle cc-green" style={CIRCLE_STYLE} />
          </motion.div>
          <div className="margin-right_block">
            <Brick className="mission-right_inner cc-hide-mobile" anim={fromRight} />
            <Brick className="mission-right_inner" anim={fromRight} />
            <Brick className="mission-right_inner cc-right" anim={fromRight} />
          </div>
        </div>
        <div className="mission-inner_block">
          <div className="mission-left_container">
            <Brick className="mission-left_block cc-vertical" anim={fromLeft} />
            <Brick className="mission-left_block cc-vertical cc-hide-desktop" anim={fromLeft} />
          </div>
          <motion.div
            className="why-text_container"
            initial={fromBottom.initial}
            whileInView={fromBottom.animate}
            viewport={VIEWPORT}
            transition={TRANS}
          >
            <p>
              이용 2일 전까지 100% 환불, 1일 전 50% 환불됩니다. 이용 당일·노쇼는 환불이 불가하며,
              우천 시 야외 테이블은 운영이 제한될 수 있습니다.
            </p>
            <p>
              예약·문의 및 단체 BBQ(최대 200명)는 010-3045-2994 (11:00~19:00)로 연락 주세요.
              단체 예약은 최소 일주일 전에 문의 부탁드립니다.
            </p>
          </motion.div>
          <div className="mission-left_container">
            <Brick className="mission-right_block cc-vertical" anim={fromRight} />
            <Brick className="mission-right_block cc-vertical cc-hide-desktop" anim={fromRight} />
          </div>
        </div>
      </div>

      <div className="mission-bottom_block">
        <Brick className="mission-right_inner cc-left" anim={fromBottom} />
        <Brick className="mission-right_inner" anim={fromBottom} />
        <Brick className="mission-right_inner" anim={fromBottom} />
        <Brick className="mission-right_inner" anim={fromBottom} />
        <Brick className="mission-right_inner cc-right cc-small" anim={fromBottom} />
      </div>
    </div>
  );
}
