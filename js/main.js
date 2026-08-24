import { initBearingModule } from './bearing.js';
import { initSettlementModule } from './settlement.js';
import { initConsolidationModule } from './consolidation.js';
import { initSlopeModule } from './slope.js';

document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('app-content');
    const tabButtons = document.querySelectorAll('.tab-btn');

    // 초기 실행 (기본 탭: 지지력 검토)
    initBearingModule(contentContainer);

    // 탭 클릭 이벤트 바인딩
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 활성 탭 스타일 토글
            tabButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            const tabName = e.target.getAttribute('data-tab');

            // 탭 종류에 따라 모듈 로드
            switch (tabName) {
                case 'bearing':
                    initBearingModule(contentContainer);
                    break;
                case 'settlement':
                    initSettlementModule(contentContainer);
                    break;
                case 'consolidation':
                    initConsolidationModule(contentContainer);
                    break;
                case 'slope':
                    initSlopeModule(contentContainer);
                    break;
                default:
                    contentContainer.innerHTML = `<p>페이지를 찾을 수 없습니다.</p>`;
            }
        });
    });
});