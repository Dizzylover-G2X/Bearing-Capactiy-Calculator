// cast_pile.js
export function initCastPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_cast_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    // 천 단위 콤마 포맷팅 유틸리티
    const parseNum = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(/,/g, '')) || 0;
    };

    const formatComma = (val, decimals = -1) => {
        let num = parseNum(val);
        if (isNaN(num)) return '';
        if (decimals >= 0) {
            let parts = num.toFixed(decimals).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        } else {
            let str = val.toString().replace(/,/g, '');
            let parts = str.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        }
    };

    const frac = (num, den) => `<span style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; margin:0 4px;"><span style="border-bottom:1px solid #2c3e50; padding:1px 4px;">${num}</span><span style="padding:1px 4px;">${den}</span></span>`;

    let savedD = parseFloat(getVal('D', '3000'));
    let pileLayers;
    try {
        pileLayers = JSON.parse(localStorage.getItem('geo_cast_pile_layers'));
        if (pileLayers && pileLayers.length > 0) {
            pileLayers.forEach(l => {
                if(l.phi === undefined) l.phi = 30;
                if(l.es === undefined) l.es = 50000;
                if(l.qu_val === undefined) l.qu_val = l.type === 'rock' ? (l.c_val || 30000) : 0;
            });
        }
    } catch (e) {
        pileLayers = null;
    }

    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '매립사질', type: 'sand', dz: 2.10, n_val: 6, gamma: 18.5, c_val: 5.0, phi: 25, es: 7000, qu_val: 0 },
            { name: '점토', type: 'clay', dz: 1.60, n_val: 11, gamma: 18.0, c_val: 35.0, phi: 0, es: 12000, qu_val: 0 },
            { name: '풍화토1', type: 'weathered_rock', dz: 1.30, n_val: 11, gamma: 19.0, c_val: 15.0, phi: 28, es: 20000, qu_val: 0 },
            { name: '풍화토2', type: 'weathered_rock', dz: 1.00, n_val: 37, gamma: 19.5, c_val: 20.0, phi: 29, es: 55000, qu_val: 0 },
            { name: '풍화토3', type: 'weathered_rock', dz: 5.60, n_val: 50, gamma: 20.0, c_val: 25.0, phi: 30, es: 70000, qu_val: 0 },
            { name: '풍화암', type: 'weathered_rock', dz: 13.40, n_val: 50, gamma: 21.0, c_val: 32.0, phi: 33, es: 220000, qu_val: 0 },
            { name: '연암', type: 'rock', dz: 6.00, n_val: 50, gamma: 23.0, c_val: 0, phi: 33, es: 1300000, qu_val: 30000 }
        ];
        try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch (e) {}
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'CAST_ROCK');
    const initialGWT = parseFloat(getVal('gwt', '3.1')).toFixed(1);

    container.innerHTML = `
        <style>
            .pl-input::-webkit-outer-spin-button, .pl-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .pl-input { -moz-appearance: textfield; width: 100%; box-sizing: border-box; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 3px; font-size: 0.88em; }
            .pl-input:focus { border-color: #2980b9; outline: none; }
        </style>

        <h3>현장타설말뚝 기초 검토 (토사 및 기반암 소켓 - 연직/수평 지지력 및 침하/변위 종합)</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label>말뚝 종류</label>
                <select id="pile_type" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="CAST_ROCK" ${initialType === 'CAST_ROCK' ? 'selected' : ''}>현장타설말뚝(기반암)</option>
                    <option value="CAST" ${initialType === 'CAST' ? 'selected' : ''}>현장타설말뚝(토사)</option>
                </select>
            </div>
            <div class="input-group" style="margin:0;">
                <label id="grid2_label">암의 유형 / RMR</label>
                <div id="grid2_content" style="height:32px; display:flex; align-items:center;"></div>
            </div>
            <div class="input-group" style="margin:0;">
                <label>말뚝 직경 D (mm)</label>
                <input type="text" id="pile_D" value="${formatComma(savedD)}" placeholder="D(mm)" class="pl-input comma-input" style="height:32px; font-weight:bold;">
            </div>
            <div class="input-group" style="margin:0;">
                <label>콘크리트 f<sub>ck</sub> / 조건</label>
                <div style="display:flex; gap:3px; height:32px;">
                    <input type="text" id="pile_fck" value="${formatComma(getVal('fck', '35'), 1)}" placeholder="fck(MPa)" class="pl-input dec-input" style="width:50%; height:100%;">
                    <select id="pile_conc_cond" style="width:50%; height:100%; box-sizing:border-box; padding:2px; font-size:0.8em;">
                        <option value="underwater" ${getVal('conc_cond', 'underwater') === 'underwater' ? 'selected' : ''}>수중 타설</option>
                        <option value="dry" ${getVal('conc_cond', 'underwater') === 'dry' ? 'selected' : ''}>비수중 타설</option>
                    </select>
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label style="font-size: 0.78em; white-space: nowrap;">허용압축응력 &sigma;<sub>ca</sub> (MPa)</label>
                <input type="text" id="grid5_val" value="${formatComma(getVal('grid5_val', '35.0'), 1)}" class="pl-input dec-input" style="height:32px; font-weight:bold;">
            </div>
        </div>

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#d35400;">평상시 연직 P<sub>norm</sub> (kN)</label><input type="text" id="pile_P_norm" value="${formatComma(getVal('P_norm', '13791.2'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#c0392b;">지진시 연직 P<sub>seis</sub> (kN)</label><input type="text" id="pile_P_seis" value="${formatComma(getVal('P_seis', '15034.5'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#2980b9;">평상시 수평 H<sub>norm</sub> (kN)</label><input type="text" id="pile_H_norm" value="${formatComma(getVal('H_norm', '1496.2'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#8e44ad;">지진시 수평 H<sub>seis</sub> (kN)</label><input type="text" id="pile_H_seis" value="${formatComma(getVal('H_seis', '3784.7'), 1)}" class="pl-input dec-input"></div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad; font-size: 0.95em;">■ 수평 해석 및 허용 기준 조건</div>
        <div class="input-grid" style="margin-bottom: 10px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2; display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label>말뚝 두부 조건</label>
                <select id="pile_head_cond" style="width:100%; height:32px; box-sizing:border-box; padding:4px 2px; font-size:0.85em; text-align:center;">
                    <option value="free" ${getVal('head_cond', 'free') === 'free' ? 'selected' : ''}>두부 자유</option>
                    <option value="fixed" ${getVal('head_cond', 'free') === 'fixed' ? 'selected' : ''}>두부 고정</option>
                </select>
            </div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#2980b9;">추정계수 &alpha; (상시)</label><input type="text" id="pile_alpha_norm" value="${formatComma(getVal('alpha_norm', '1.0'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#8e44ad;">콘크리트 E<sub>p</sub>(kPa)</label><input type="text" id="pile_Ep" value="${formatComma(getVal('Ep', '26700000'))}" class="pl-input comma-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#d4ac0d;">허용 연직 침하(mm)</label><input type="text" id="pile_allow_settle" value="${formatComma(getVal('allow_settle', '25.0'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#16a085;">상시 허용수평변위(mm)</label><input type="text" id="pile_allow_h_disp_norm" value="${formatComma(getVal('allow_h_disp_norm', '15.0'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#c0392b;">지진시 허용수평변위(mm)</label><input type="text" id="pile_allow_h_disp_seis" value="${formatComma(getVal('allow_h_disp_seis', '25.0'), 1)}" class="pl-input dec-input"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-weight: bold; color: #27ae60; font-size: 0.95em;">■ 지층 정보</span>
                <div style="display: flex; align-items: center; gap: 5px; font-size: 0.85em; background: #eaf2f8; padding: 2px 8px; border-radius: 4px; border: 1px solid #aeb6bf;">
                    <label for="pile_gwt" style="font-weight: bold;">지하수위 GWT (GL. -m):</label>
                    <input type="number" id="pile_gwt" value="${initialGWT}" step="0.1" style="width: 55px; height: 22px; text-align: center; border: 1px solid #ccc; font-weight: bold;">
                </div>
            </div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 8px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0; overflow-x: auto;">
                <table class="result-table" style="font-size: 0.8em; text-align: center; margin: 0; width: 100%;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th style="width: 12%;">지층명</th>
                            <th style="width: 13%;">토성구분</th>
                            <th style="width: 7%;">층후(m)</th>
                            <th style="width: 7%;">N치</th>
                            <th style="width: 9%;">&gamma;<br>(kN/m³)</th>
                            <th style="width: 9%;">점착력 c<br>(kPa)</th>
                            <th style="width: 9%;">마찰각 &phi;<br>(°)</th>
                            <th style="width: 14%;">변형계수 E<sub>s</sub><br>(kPa)</th>
                            <th style="width: 12%;">일축강도 q<sub>u</sub><br>(kPa)</th>
                            <th style="width: 5%;">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body"></tbody>
                    <tfoot>
                        <tr style="background-color: #ebf5fb; font-weight: bold; border-top: 2px solid #a3e4d7;">
                            <td colspan="2" style="padding: 6px; text-align: right; color: #2980b9;">말뚝 총 길이 L (m) :</td>
                            <td id="pile_L_val" style="padding: 6px; color: #16a085; font-size: 1.05em;">${calcTotalL().toFixed(1)}</td>
                            <td colspan="7" style="padding: 6px; text-align: left; color: #7f8c8d; font-size: 0.9em;">(지층 층후 자동 합산)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer;">현장타설말뚝 지지력, 수평력 및 침하량 종합산정</button>
        <div id="pile-result" class="result-box" style="display: none;"></div>
    `;

    // 콤마 입력 실시간 제어
    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('comma-input')) {
            let rawVal = e.target.value.replace(/,/g, '');
            if (!isNaN(parseFloat(rawVal)) || rawVal === '' || rawVal === '.') {
                e.target.value = formatComma(rawVal);
            }
        }
    });

    function updateFormulaInfoText() {
        const type = container.querySelector('#pile_type').value;
        const qpVal = container.querySelector('#pile_qp_formula')?.value || 'rock_case2';
        const qsVal = container.querySelector('#pile_qs_formula')?.value || 'oneill';
        const infoBox = container.querySelector('#formula_info_box');

        if (!infoBox) return;

        let qpText = "";
        let qsText = "";

        if (type === 'CAST_ROCK') {
            if (qpVal === 'rock_case1') qpText = "q<sub>p</sub> = 2.5 &times; q<sub>u</sub> (신선암 / 암반절리 미고려)";
            else qpText = "q<sub>p</sub> = [&radic;s + &radic;(m &times; &radic;s + s)] &times; q<sub>u</sub> (여러방향 절리, Hoek-Brown 1988 적용)";
            qsText = "토사: AASHTO(2012) &beta; 산정식 (상한 190kPa) / 암반: Horvath & Kenney (1979) [Q<sub>s</sub> = 0.65 &times; &alpha;<sub>E</sub> &times; P<sub>a</sub> &times; (q<sub>u</sub>/P<sub>a</sub>)<sup>0.5</sup>]";
        } else {
            if (qpVal === 'oneill') qpText = "57.4 &times; N (N&le;75) / 4,309.2 kN/m² (N>75) [O'Neill & Reese (1999)]";
            else qpText = "100 &times; N_bar (사질토) / 6 &times; c<sub>u</sub> (점성토) [건축기초 구조설계지침]";
            if (qsVal === 'oneill') qsText = "AASHTO LRFD (2012) &beta; 산정식 적용 (사질토/풍화암/자갈층 상한 190 kPa)";
            else qsText = "3.3 &times; N (사질토) / 1.0 &times; c<sub>u</sub> (점성토) [건축기초 구조설계지침]";
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 2px;">▶ 적용 산정식 개요</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>연직 선단지지력 :</strong> ${qpText}<br>
                • <strong>연직 주면마찰력 :</strong> ${qsText}<br>
                • <strong>침하량 산정 :</strong> ${type === 'CAST_ROCK' ? 'Pells & Turner (1979) 암반소켓 탄성침하 공식 적용' : 'Vesic (1977) 경험적 침하 공식 적용'}<br>
                • <strong>수평 지지력/변위 :</strong> Broms 극한평형법 및 Chang 탄성지반반력법 적용
            </div>
        `;
    }

    function updateUIState() {
        const type = container.querySelector('#pile_type').value;
        const grid2Label = container.querySelector('#grid2_label');
        const grid2Content = container.querySelector('#grid2_content');
        const row2Container = container.querySelector('#pile_row2_container');

        if (!grid2Content || !row2Container) return;

        const initialRebarD = getVal('rebar_d', '38.10');
        const initialRebarFy = getVal('rebar_fy', '400');
        const initialRebarCount = getVal('rebar_count', '64');

        const rebarBoxHtml = `
            <div class="input-group" style="margin:0;">
                <label>보강철근 제원</label>
                <div style="display:flex; gap:2px; height:32px; align-items:center;">
                    <select id="pile_rebar_d" style="flex:1.2; height:100%; box-sizing:border-box; padding:2px; font-size:0.78em;">
                        <option value="19.10" ${initialRebarD === '19.10' ? 'selected' : ''}>D19</option>
                        <option value="22.20" ${initialRebarD === '22.20' ? 'selected' : ''}>D22</option>
                        <option value="25.40" ${initialRebarD === '25.40' ? 'selected' : ''}>D25</option>
                        <option value="28.60" ${initialRebarD === '28.60' ? 'selected' : ''}>D29</option>
                        <option value="31.80" ${initialRebarD === '31.80' ? 'selected' : ''}>D32</option>
                        <option value="34.90" ${initialRebarD === '34.90' ? 'selected' : ''}>D35</option>
                        <option value="38.10" ${initialRebarD === '38.10' ? 'selected' : ''}>D38</option>
                    </select>
                    <select id="pile_rebar_fy" style="flex:1.3; height:100%; box-sizing:border-box; padding:2px; font-size:0.78em;">
                        <option value="400" ${initialRebarFy === '400' ? 'selected' : ''}>SD400</option>
                        <option value="500" ${initialRebarFy === '500' ? 'selected' : ''}>SD500</option>
                    </select>
                    <input type="number" id="pile_rebar_count" value="${initialRebarCount}" class="pl-input" placeholder="개수" style="width:38px; height:100%;">
                    <span style="font-size:0.75em; font-weight:bold; color:#2c3e50;">개</span>
                </div>
            </div>
        `;

        if (type === 'CAST_ROCK') {
            grid2Label.innerHTML = '암의 유형 / RMR';
            grid2Content.innerHTML = `
                <div style="display:flex; gap:3px; width:100%; height:100%;">
                    <select id="pile_rock_type" style="flex:1.8; text-align:left; padding-left:4px; box-sizing:border-box; border:1px solid #ccc; font-size:0.75em;">
                        <option value="7">A:벽개발달 탄산염암</option>
                        <option value="10">B:석화 이질암</option>
                        <option value="15">C:뚜렷한벽개 사질암</option>
                        <option value="17" selected>D:세립결정 화성암</option>
                        <option value="25">E:조립결정 화성변성</option>
                    </select>
                    <input type="number" id="pile_rmr" value="${getVal('rmr', '30')}" step="1" placeholder="RMR" class="pl-input" style="flex:1;">
                </div>
            `;

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label>선단지지력 산정식</label>
                    <select id="pile_qp_formula" style="width:100%; height:32px; padding:4px; font-size:0.82em;">
                        <option value="rock_case2" ${getVal('qp_formula', 'rock_case2') === 'rock_case2' ? 'selected' : ''}>Hoek-Brown (여러방향 절리)</option>
                        <option value="rock_case1" ${getVal('qp_formula', 'rock_case2') === 'rock_case1' ? 'selected' : ''}>Case-1 (2.5 q_u)</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>주면마찰력 산정식</label>
                    <select id="pile_qs_formula" style="width:100%; height:32px; padding:4px; font-size:0.82em;" disabled>
                        <option value="horvath" selected>O'Neill(토사) & H&K (암반)</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>Joint 상태</label>
                    <select id="pile_joint_state" style="width:100%; height:32px; padding:4px; font-size:0.85em;">
                        <option value="closed" ${getVal('joint_state', 'closed') === 'closed' ? 'selected' : ''}>Closed Joints</option>
                        <option value="open" ${getVal('joint_state', 'closed') === 'open' ? 'selected' : ''}>Open Joints</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>RQD (%)</label>
                    <input type="text" id="pile_rqd" value="${formatComma(getVal('rqd', '4.0'), 1)}" class="pl-input dec-input" style="height:32px;">
                </div>
                ${rebarBoxHtml}
            `;
        } else {
            grid2Label.textContent = '세부 구분';
            grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label>선단지지력 산정식</label>
                    <select id="pile_qp_formula" style="width:100%; height:32px; padding:4px; font-size:0.82em;">
                        <option value="oneill" ${getVal('qp_formula', 'oneill') === 'oneill' ? 'selected' : ''}>O'Neill & Reese (1999)</option>
                        <option value="aij" ${getVal('qp_formula', 'oneill') === 'aij' ? 'selected' : ''}>건축기초 구조설계지침 (2004)</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>주면마찰력 산정식</label>
                    <select id="pile_qs_formula" style="width:100%; height:32px; padding:4px; font-size:0.82em;">
                        <option value="oneill" ${getVal('qs_formula', 'oneill') === 'oneill' ? 'selected' : ''}>AASHTO LRFD (2012)</option>
                        <option value="aij" ${getVal('qs_formula', 'oneill') === 'aij' ? 'selected' : ''}>건축기초 구조설계지침 (2004)</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0; grid-column: span 2;">
                    <label>시공 조건</label>
                    <div style="height:32px; display:flex; align-items:center; color:#7f8c8d; font-size:0.85em;">현장타설말뚝 (Bored Cast-in-place Pile)</div>
                </div>
                ${rebarBoxHtml}
            `;
        }
        updateFormulaInfoText();
    }

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            const nextIdx = pileLayers.length + 1;
            pileLayers.push({ name: `지층${nextIdx}`, type: 'sand', dz: 3.0, n_val: 30, gamma: 19.0, c_val: 0, phi: 30, es: 50000, qu_val: 0 });
            try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
            renderLayers();
        } else if (e.target.classList.contains('pl-del')) {
            pileLayers.splice(e.target.dataset.idx, 1);
            try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
            renderLayers();
        }
    });

    const calcBtn = container.querySelector('#calc-pile-btn');
    if (calcBtn) {
        calcBtn.addEventListener('click', calculatePileCapacity);
    }

    // 커서 포커스 아웃 시 포맷팅 및 업데이트
    container.addEventListener('focusout', (e) => {
        const target = e.target;
        if (target.classList.contains('dec-input')) {
            target.value = formatComma(parseNum(target.value), 1);
            return;
        }

        const idx = target.dataset.idx;
        if (idx === undefined) return;

        let val = parseNum(target.value);

        if (target.classList.contains('pl-dz')) {
            pileLayers[idx].dz = val;
            target.value = val.toFixed(1);
            updatePileLength();
        } else if (target.classList.contains('pl-gamma')) {
            pileLayers[idx].gamma = val;
            target.value = val.toFixed(1);
        } else if (target.classList.contains('pl-c')) {
            pileLayers[idx].c_val = val;
            target.value = val.toFixed(1);
        } else if (target.classList.contains('pl-phi')) {
            pileLayers[idx].phi = val;
            target.value = val.toFixed(1);
        } else if (target.classList.contains('pl-n')) {
            pileLayers[idx].n_val = Math.round(val);
            target.value = Math.round(val);
        } else if (target.classList.contains('pl-es')) {
            pileLayers[idx].es = Math.round(val);
            target.value = formatComma(Math.round(val));
        } else if (target.classList.contains('pl-qu')) {
            pileLayers[idx].qu_val = Math.round(val);
            target.value = formatComma(Math.round(val));
        } else if (target.classList.contains('pl-name')) {
            pileLayers[idx].name = target.value;
        }

        try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
    });

    container.addEventListener('change', (e) => {
        if (e.target.id === 'pile_type') {
            updateUIState();
            renderLayers();
            try { localStorage.setItem('geo_cast_pile_type', e.target.value); } catch(err){}
        } else if (['pile_qp_formula', 'pile_qs_formula', 'pile_rmr', 'pile_fck', 'pile_conc_cond', 'pile_joint_state', 'pile_rqd', 'pile_rebar_d', 'pile_rebar_fy', 'pile_rebar_count', 'pile_alpha_norm', 'pile_allow_settle', 'pile_allow_h_disp_norm', 'pile_allow_h_disp_seis', 'pile_head_cond'].includes(e.target.id)) {
            try { localStorage.setItem('geo_cast_pile_' + e.target.id, e.target.value); } catch(err){}
            if (e.target.id.includes('formula')) updateFormulaInfoText();
        } else if (['pile_Ep', 'grid5_val', 'pile_D', 'pile_P_norm', 'pile_P_seis', 'pile_H_norm', 'pile_H_seis'].includes(e.target.id)) {
            try { localStorage.setItem('geo_cast_pile_' + e.target.id, parseNum(e.target.value)); } catch(err){}
        }

        if (e.target.id === 'pile_gwt') {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            try { localStorage.setItem('geo_cast_pile_gwt', e.target.value); } catch(err){}
        }
        if (e.target.classList.contains('pl-type')) {
            pileLayers[e.target.dataset.idx].type = e.target.value;
            try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
        }
    });

    updateUIState();

    function updatePileLength() {
        const totalL = calcTotalL();
        const pileLVal = container.querySelector('#pile_L_val');
        if (pileLVal) {
            pileLVal.textContent = totalL.toFixed(1);
            try { localStorage.setItem('geo_cast_pile_L', totalL.toFixed(1)); } catch(err){}
        }
    }

    function renderLayers() {
        const tbody = container.querySelector('#pile_layers_body');
        if (!tbody) return;

        const currentPileType = container.querySelector('#pile_type')?.value || 'CAST_ROCK';

        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            if (currentPileType === 'CAST' && l.type === 'rock') {
                l.type = 'weathered_rock';
            }
            const gammaVal = l.gamma !== undefined ? l.gamma : 19.0;
            const rockOptionHtml = currentPileType === 'CAST' ? '' : `<option value="rock" ${l.type === 'rock' ? 'selected' : ''}>기반암(연/경암)</option>`;

            tbody.innerHTML += `
                <tr>
                    <td style="padding:2px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name pl-input"></td>
                    <td style="padding:2px;">
                        <select data-idx="${idx}" class="pl-type pl-select" style="font-size:0.85em; width:100%; height:100%; text-align-last:center;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                            <option value="gravel" ${l.type === 'gravel' ? 'selected' : ''}>자갈층</option>
                            <option value="weathered_rock" ${l.type === 'weathered_rock' ? 'selected' : ''}>풍화암</option>
                            ${rockOptionHtml}
                        </select>
                    </td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.dz).toFixed(1)}" data-idx="${idx}" class="pl-dz pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.n_val)).toFixed(0)}" data-idx="${idx}" class="pl-n pl-input" step="1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(gammaVal).toFixed(1)}" data-idx="${idx}" class="pl-gamma pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.c_val).toFixed(1)}" data-idx="${idx}" class="pl-c pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.phi).toFixed(1)}" data-idx="${idx}" class="pl-phi pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="text" value="${formatComma(Math.round(parseFloat(l.es)))}" data-idx="${idx}" class="pl-es pl-input comma-input"></td>
                    <td style="padding:2px;"><input type="text" value="${formatComma(Math.round(parseFloat(l.qu_val)))}" data-idx="${idx}" class="pl-qu pl-input comma-input"></td>
                    <td style="padding:2px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:2px 6px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
        updatePileLength();
    }
    renderLayers();

    // Hoek & Brown 데이터
    const HB_TABLE_DATA = [
        { rmr: 3,   m: { 7: 0.007, 10: 0.010, 15: 0.015, 17: 0.017, 25: 0.025 }, s: 1.0e-7 },
        { rmr: 23,  m: { 7: 0.029, 10: 0.041, 15: 0.061, 17: 0.069, 25: 0.102 }, s: 3.0e-6 },
        { rmr: 44,  m: { 7: 0.128, 10: 0.183, 15: 0.275, 17: 0.311, 25: 0.458 }, s: 9.0e-5 },
        { rmr: 65,  m: { 7: 0.575, 10: 0.821, 15: 1.231, 17: 1.395, 25: 2.052 }, s: 0.0029 },
        { rmr: 85,  m: { 7: 2.400, 10: 3.430, 15: 5.140, 17: 5.820, 25: 8.567 }, s: 0.082 },
        { rmr: 100, m: { 7: 7.000, 10: 10.000, 15: 15.000, 17: 17.000, 25: 25.000 }, s: 1.00 }
    ];

    const TABLE_EM_EI = [
        { rqd: 0,   closed: 0.0,  open: 0.0 },
        { rqd: 20,  closed: 0.05, open: 0.05 },
        { rqd: 50,  closed: 0.15, open: 0.10 },
        { rqd: 70,  closed: 0.70, open: 0.10 },
        { rqd: 100, closed: 1.00, open: 0.60 }
    ];

    const TABLE_ALPHA_E = [
        { ratio: 0.000, alpha: 0.000 },
        { ratio: 0.010, alpha: 0.370 },
        { ratio: 0.050, alpha: 0.450 },
        { ratio: 0.100, alpha: 0.550 },
        { ratio: 0.300, alpha: 0.700 },
        { ratio: 0.500, alpha: 0.800 },
        { ratio: 1.000, alpha: 1.000 }
    ];

    function interpolateHoekBrown(rmrVal, miVal) {
        if (rmrVal <= 3) return { m: HB_TABLE_DATA[0].m[miVal], s: HB_TABLE_DATA[0].s };
        if (rmrVal >= 100) return { m: HB_TABLE_DATA[5].m[miVal], s: HB_TABLE_DATA[5].s };
        for (let i = 0; i < HB_TABLE_DATA.length - 1; i++) {
            const row1 = HB_TABLE_DATA[i], row2 = HB_TABLE_DATA[i + 1];
            if (rmrVal >= row1.rmr && rmrVal <= row2.rmr) {
                const t = (rmrVal - row1.rmr) / (row2.rmr - row1.rmr);
                return { m: row1.m[miVal] + t * (row2.m[miVal] - row1.m[miVal]), s: row1.s + t * (row2.s - row1.s) };
            }
        }
        return { m: HB_TABLE_DATA[2].m[miVal], s: HB_TABLE_DATA[2].s };
    }

    function interpolateEmEi(rqdVal, jointState) {
        const key = jointState === 'open' ? 'open' : 'closed';
        if (rqdVal <= 0) return TABLE_EM_EI[0][key];
        if (rqdVal >= 100) return TABLE_EM_EI[TABLE_EM_EI.length - 1][key];
        for (let i = 0; i < TABLE_EM_EI.length - 1; i++) {
            if (rqdVal >= TABLE_EM_EI[i].rqd && rqdVal <= TABLE_EM_EI[i + 1].rqd) {
                const t = (rqdVal - TABLE_EM_EI[i].rqd) / (TABLE_EM_EI[i + 1].rqd - TABLE_EM_EI[i].rqd);
                return TABLE_EM_EI[i][key] + t * (TABLE_EM_EI[i + 1][key] - TABLE_EM_EI[i][key]);
            }
        }
        return 0.05;
    }

    function interpolateAlphaE(ratioVal) {
        if (ratioVal <= 0) return TABLE_ALPHA_E[0].alpha;
        if (ratioVal >= 1.0) return TABLE_ALPHA_E[TABLE_ALPHA_E.length - 1].alpha;
        for (let i = 0; i < TABLE_ALPHA_E.length - 1; i++) {
            if (ratioVal >= TABLE_ALPHA_E[i].ratio && ratioVal <= TABLE_ALPHA_E[i + 1].ratio) {
                const t = (ratioVal - TABLE_ALPHA_E[i].ratio) / (TABLE_ALPHA_E[i + 1].ratio - TABLE_ALPHA_E[i].ratio);
                return TABLE_ALPHA_E[i].alpha + t * (TABLE_ALPHA_E[i + 1].alpha - TABLE_ALPHA_E[i].alpha);
            }
        }
        return 0.370;
    }

    function getIps(dr_br, ec_em) {
        const x_vals = [0, 0.5, 1, 2, 3, 5];
        const y_ratios = [0.2, 0.5, 1, 2, 10, 50, 1000];
        const grid = [
            [0.55, 1.15, 1.30, 1.35, 1.38, 1.42],
            [0.55, 0.65, 0.68, 0.70, 0.71, 0.72],
            [0.55, 0.53, 0.53, 0.53, 0.53, 0.53],
            [0.55, 0.42, 0.38, 0.36, 0.35, 0.34],
            [0.55, 0.30, 0.25, 0.21, 0.20, 0.16],
            [0.55, 0.28, 0.21, 0.15, 0.13, 0.08],
            [0.55, 0.25, 0.18, 0.13, 0.09, 0.03]
        ];

        let dr = Math.max(0, Math.min(5, dr_br));
        let ec = Math.max(0.2, Math.min(1000, ec_em));
        
        let c0 = 0, c1 = 1;
        while(c1 < x_vals.length - 1 && x_vals[c1] < dr) { c0++; c1++; }
        let tx = (dr - x_vals[c0]) / (x_vals[c1] - x_vals[c0]);

        let r0 = 0, r1 = 1;
        while(r1 < y_ratios.length - 1 && y_ratios[r1] < ec) { r0++; r1++; }
        let ty = (Math.log10(ec) - Math.log10(y_ratios[r0])) / (Math.log10(y_ratios[r1]) - Math.log10(y_ratios[r0]));

        let v00 = grid[r0][c0], v01 = grid[r0][c1];
        let v10 = grid[r1][c0], v11 = grid[r1][c1];
        let v0 = v00 + tx * (v01 - v00);
        let v1 = v10 + ty * (v11 - v10);
        return v0 + ty * (v1 - v0);
    }

    function calcSoilAvgWithinDepth(targetDepth, layers) {
        let cumDepth = 0;
        let sumN = 0, sumEs = 0, sumCovered = 0;

        for (let l of layers) {
            let dz = parseFloat(l.dz) || 0;
            let nval = parseFloat(l.n_val) || 0;
            let esval = parseFloat(l.es) || (2800 * nval);

            let lTop = cumDepth;
            let lBot = cumDepth + dz;

            if (lTop >= targetDepth) break;

            let coverStart = lTop;
            let coverEnd = Math.min(lBot, targetDepth);
            let coverLen = coverEnd - coverStart;

            if (coverLen > 0) {
                sumN += nval * coverLen;
                sumEs += esval * coverLen;
                sumCovered += coverLen;
            }
            cumDepth += dz;
        }

        if (sumCovered <= 0) {
            let first = layers[0] || { n_val: 10, es: 28000 };
            return { avgN: parseFloat(first.n_val) || 10, avgEs: parseFloat(first.es) || 28000 };
        }

        return { avgN: sumN / sumCovered, avgEs: sumEs / sumCovered };
    }

    function calculateHorizontalSoilReaction(alphaNorm, Ep, D, Ip_cm4, layers) {
        const EI = Ep * (Ip_cm4 / 1.0e8);
        const alphaSeis = alphaNorm * 2.0;

        // 1. 도로교 표준시방서 축차계산 (평상시)
        let betaNorm = 0.20000;
        let stepsRoadNorm = [];
        let kh_road_norm = 0, E0_road_norm = 0, avgN_road_norm = 0, invBeta_road_norm = 0;

        for (let step = 1; step <= 9; step++) {
            invBeta_road_norm = 1.0 / betaNorm;
            let soilInfo = calcSoilAvgWithinDepth(invBeta_road_norm, layers);
            avgN_road_norm = soilInfo.avgN;
            E0_road_norm = soilInfo.avgEs;

            let BH = Math.sqrt(D / betaNorm);
            let kh0 = (1.0 / 0.3) * alphaNorm * E0_road_norm;
            kh_road_norm = kh0 * Math.pow((1.0 / 0.3) * BH, -0.75);

            let newBeta = Math.pow((kh_road_norm * D) / (4.0 * EI), 0.25);
            let err = Math.abs((newBeta - betaNorm) / betaNorm) * 100.0;

            stepsRoadNorm.push({
                step: 'Step ' + step,
                beta_in: betaNorm,
                inv_beta: invBeta_road_norm,
                N: avgN_road_norm,
                E0: E0_road_norm,
                kh: kh_road_norm,
                beta_out: newBeta,
                err: err
            });

            if (err < 0.01) break;
            betaNorm = newBeta;
        }

        // 2. 도로교 표준시방서 축차계산 (지진시)
        let betaSeis = 0.20000;
        let stepsRoadSeis = [];
        let kh_road_seis = 0, E0_road_seis = 0, avgN_road_seis = 0, invBeta_road_seis = 0;

        for (let step = 1; step <= 9; step++) {
            invBeta_road_seis = 1.0 / betaSeis;
            let soilInfo = calcSoilAvgWithinDepth(invBeta_road_seis, layers);
            avgN_road_seis = soilInfo.avgN;
            E0_road_seis = soilInfo.avgEs;

            let BH = Math.sqrt(D / betaSeis);
            let kh0 = (1.0 / 0.3) * alphaSeis * E0_road_seis;
            kh_road_seis = kh0 * Math.pow((1.0 / 0.3) * BH, -0.75);

            let newBeta = Math.pow((kh_road_seis * D) / (4.0 * EI), 0.25);
            let err = Math.abs((newBeta - betaSeis) / betaSeis) * 100.0;

            stepsRoadSeis.push({
                step: 'Step ' + step,
                beta_in: betaSeis,
                inv_beta: invBeta_road_seis,
                N: avgN_road_seis,
                E0: E0_road_seis,
                kh: kh_road_seis,
                beta_out: newBeta,
                err: err
            });

            if (err < 0.01) break;
            betaSeis = newBeta;
        }

        // 3. 후쿠오카 공식 축차계산
        let betaF = 0.20000;
        let stepsFukuoka = [];
        let kh_fukuoka = 0, avgN_fukuoka = 0, invBeta_fukuoka = 0;

        for (let step = 1; step <= 9; step++) {
            invBeta_fukuoka = 1.0 / betaF;
            let soilInfo = calcSoilAvgWithinDepth(invBeta_fukuoka, layers);
            avgN_fukuoka = soilInfo.avgN;

            kh_fukuoka = 0.691 * Math.pow(avgN_fukuoka, 0.406) * 9806.65;

            let newBetaF = Math.pow((kh_fukuoka * D) / (4.0 * EI), 0.25);
            let err = Math.abs((newBetaF - betaF) / betaF) * 100.0;

            stepsFukuoka.push({
                step: 'Step ' + step,
                beta_in: betaF,
                inv_beta: invBeta_fukuoka,
                N: avgN_fukuoka,
                kh: kh_fukuoka,
                beta_out: newBetaF,
                err: err
            });

            if (err < 0.01) break;
            betaF = newBetaF;
        }

        let applied_kh_norm = Math.min(kh_road_norm, kh_fukuoka);
        let applied_beta_norm = Math.pow((applied_kh_norm * D) / (4.0 * EI), 0.25);
        let kh_norm_source = kh_road_norm <= kh_fukuoka ? '도로교설계기준해설' : '후쿠오카 공식';

        let applied_kh_seis = Math.min(kh_road_seis, kh_fukuoka);
        let applied_beta_seis = Math.pow((applied_kh_seis * D) / (4.0 * EI), 0.25);
        let kh_seis_source = kh_road_seis <= kh_fukuoka ? '도로교설계기준해설' : '후쿠오카 공식';

        return {
            EI: EI,
            alphaNorm: alphaNorm,
            alphaSeis: alphaSeis,
            kh_road_norm: kh_road_norm,
            beta_road_norm: betaNorm,
            invBeta_road_norm: invBeta_road_norm,
            N_road_norm: avgN_road_norm,
            E0_road_norm: E0_road_norm,
            stepsRoadNorm: stepsRoadNorm,
            kh_road_seis: kh_road_seis,
            beta_road_seis: betaSeis,
            invBeta_road_seis: invBeta_road_seis,
            N_road_seis: avgN_road_seis,
            E0_road_seis: E0_road_seis,
            stepsRoadSeis: stepsRoadSeis,
            kh_fukuoka: kh_fukuoka,
            beta_fukuoka: betaF,
            invBeta_fukuoka: invBeta_fukuoka,
            N_fukuoka: avgN_fukuoka,
            stepsFukuoka: stepsFukuoka,
            applied_kh_norm: applied_kh_norm,
            applied_beta_norm: applied_beta_norm,
            kh_norm_source: kh_norm_source,
            applied_kh_seis: applied_kh_seis,
            applied_beta_seis: applied_beta_seis,
            kh_seis_source: kh_seis_source
        };
    }

    function calculatePileCapacity() {
        const p_type = container.querySelector('#pile_type').value;

        if (p_type === 'CAST_ROCK') {
            const lastLayerCheck = pileLayers.length > 0 ? pileLayers[pileLayers.length - 1] : null;
            if (!lastLayerCheck || lastLayerCheck.type !== 'rock') {
                alert("⚠️ 현장타설말뚝(기반암)이 선택되었습니다.\n최하단 지층의 토성 구분을 '기반암(연암)'으로 설정해 주세요.");
                return;
            }
        }

        const qp_formula_key = container.querySelector('#pile_qp_formula')?.value || 'rock_case2';
        const qs_formula_key = container.querySelector('#pile_qs_formula')?.value || 'oneill';

        const D_mm = parseNum(container.querySelector('#pile_D').value) || 3000;
        const D = D_mm / 1000.0;
        const gwt = parseFloat(container.querySelector('#pile_gwt')?.value) || 3.1;
        const allow_settle = parseNum(container.querySelector('#pile_allow_settle')?.value) || 25.0;
        
        // 허용 수평변위량 상시/지진시 분리 적용
        const allow_h_disp_norm = parseNum(container.querySelector('#pile_allow_h_disp_norm')?.value) || 15.0;
        const allow_h_disp_seis = parseNum(container.querySelector('#pile_allow_h_disp_seis')?.value) || 25.0;
        
        const head_cond = container.querySelector('#pile_head_cond')?.value || 'free';
        const alpha_norm_val = parseNum(container.querySelector('#pile_alpha_norm')?.value) || 1.0;

        const user_fck = parseNum(container.querySelector('#pile_fck')?.value) || 35.0;
        const conc_cond = container.querySelector('#pile_conc_cond')?.value || 'underwater';
        const user_rebar_d_mm = parseNum(container.querySelector('#pile_rebar_d')?.value) || 38.10;
        const user_rebar_fy_MPa = parseNum(container.querySelector('#pile_rebar_fy')?.value) || 400;
        const user_rebar_count = parseNum(container.querySelector('#pile_rebar_count')?.value) || 0;

        let fck_eff = 35.0;
        let conc_str_detail = "";
        if (conc_cond === 'underwater') {
            if (Math.abs(user_fck - 30) < 0.1) fck_eff = 24.0;
            else if (Math.abs(user_fck - 35) < 0.1) fck_eff = 27.0;
            else if (Math.abs(user_fck - 40) < 0.1) fck_eff = 30.0;
            else fck_eff = user_fck * 0.8;
            conc_str_detail = `수중 콘크리트 적용 (호칭강도 ${user_fck} MPa &rarr; 설계기준강도 ${fck_eff.toFixed(1)} MPa)`;
        } else {
            fck_eff = user_fck;
            conc_str_detail = `비수중 콘크리트 적용 (설계기준강도 ${user_fck} MPa)`;
        }

        let em_ei_val = 0.01, alpha_e_val = 0.370;
        if (p_type === 'CAST_ROCK') {
            const user_joint_state = container.querySelector('#pile_joint_state')?.value || 'closed';
            const user_rqd = parseNum(container.querySelector('#pile_rqd')?.value) || 4.0;
            em_ei_val = interpolateEmEi(user_rqd, user_joint_state);
            alpha_e_val = interpolateAlphaE(em_ei_val);
        }

        const L = calcTotalL();
        const P_norm = parseNum(container.querySelector('#pile_P_norm').value) || 0;
        const P_seis = parseNum(container.querySelector('#pile_P_seis').value) || 0;
        const H_norm = parseNum(container.querySelector('#pile_H_norm').value) || 0;
        const H_seis = parseNum(container.querySelector('#pile_H_seis').value) || 0;
        const user_Ep = parseNum(container.querySelector('#pile_Ep')?.value) || 26700000;

        // 1. 연직 선단지지력 (Qup)
        let lastLayer = pileLayers[pileLayers.length - 1] || { name: '지반', n_val: 50, qu_val: 30000 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let qu_tip = parseFloat(lastLayer.qu_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 
        let qp_calc_detail = "";
        let hbRes = null, hb_m = 0, hb_s = 0;

        if (p_type === 'CAST_ROCK') {
            if (qp_formula_key === 'rock_case1') {
                q_p = 2.5 * qu_tip;
                qp_calc_detail = `• 공식: q<sub>p</sub> = 2.5 &times; q<sub>u</sub><br>• 계산: 2.5 &times; ${formatComma(qu_tip, 1)}<br>• 결과: q<sub>p</sub> = <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
            } else {
                let hb_mi = parseInt(container.querySelector('#pile_rock_type')?.value) || 17;
                let input_rmr = parseNum(container.querySelector('#pile_rmr')?.value) || 30;
                hbRes = interpolateHoekBrown(input_rmr, hb_mi);
                hb_m = hbRes.m; hb_s = hbRes.s;
                let factor = Math.sqrt(hb_s) + Math.sqrt(hb_m * Math.sqrt(hb_s) + hb_s);
                q_p = factor * qu_tip;
                qp_calc_detail = `• 공식: q<sub>p</sub> = [&radic;s + &radic;(m&radic;s + s)] &times; q<sub>u</sub><br>• 계산: [&radic;${hb_s.toExponential(3)} + &radic;(${hb_m.toFixed(4)}&times;&radic;${hb_s.toExponential(3)} + ${hb_s.toExponential(3)})] &times; ${formatComma(qu_tip, 1)} = ${factor.toFixed(4)} &times; ${formatComma(qu_tip, 1)}<br>• 결과: q<sub>p</sub> = <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
            }
        } else { // CAST
            if (qp_formula_key === 'oneill') {
                q_p = raw_N_tip <= 75 ? 57.4 * raw_N_tip : 4309.2;
                qp_calc_detail = `• 공식: q<sub>p</sub> = ${raw_N_tip <= 75 ? "57.4 &times; N" : "4309.2 (N>75 상한)"}<br>• 계산: ${raw_N_tip <= 75 ? `57.4 &times; ${raw_N_tip}` : "4309.2"}<br>• 결과: q<sub>p</sub> = <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
            } else {
                let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(lastLayer.type);
                if (isGranular) {
                    q_p = 100.0 * raw_N_tip;
                    qp_calc_detail = `• 공식: q<sub>p</sub> = 100 &times; N<br>• 계산: 100 &times; ${raw_N_tip}<br>• 결과: q<sub>p</sub> = <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
                } else {
                    q_p = 6.0 * c_tip;
                    qp_calc_detail = `• 공식: q<sub>p</sub> = 6 &times; c<sub>u</sub><br>• 계산: 6 &times; ${c_tip}<br>• 결과: q<sub>p</sub> = <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
                }
            }
        }

        const Qup = q_p * Ap;

        // 2. 연직 주면마찰력 (Qus)
        const As = Math.PI * D;
        let total_Qus = 0;
        let layer_calc_rows = [];

        let soilLayers = pileLayers.filter(l => l.type !== 'rock');
        let sum_N_dz = 0, sum_dz = 0;
        soilLayers.forEach(l => {
            let nval = parseFloat(l.n_val) || 0;
            let dz = parseFloat(l.dz) || 0;
            sum_N_dz += nval * dz; sum_dz += dz;
        });
        const N_60 = sum_dz > 0 ? (sum_N_dz / sum_dz) : 0;

        let cum_depth = 0;
        let cum_sigma_v = 0;
        const typeMap = { 'sand': '사질토', 'clay': '점성토', 'gravel': '자갈층', 'weathered_rock': '풍화암', 'rock': '기반암' };

        pileLayers.forEach(l => {
            let f_unit = 0;
            let formula_str = "";
            let dz_i = parseFloat(l.dz) || 0;
            let gamma_i = parseFloat(l.gamma) || 19.0;
            let c_val_i = parseFloat(l.c_val) || 0; 
            let qu_val_i = parseFloat(l.qu_val) || 0; 

            let z_mid = cum_depth + 0.5 * dz_i;
            let sigma_v_mid = cum_sigma_v + gamma_i * (0.5 * dz_i);
            let u_mid = Math.max(0, (z_mid - gwt) * 9.807);
            let sigma_v_prime = Math.max(0, sigma_v_mid - u_mid);

            if (l.type === 'rock' && p_type === 'CAST_ROCK') {
                let P_a = 0.101; 
                let qu_MPa = qu_val_i / 1000.0; 
                let fs_MPa = 0.65 * alpha_e_val * P_a * Math.pow(qu_MPa / P_a, 0.5); 
                let fs_limit_MPa = 7.8 * P_a * Math.pow(fck_eff / P_a, 0.5); 
                let f_unit_MPa = Math.min(fs_MPa, fs_limit_MPa);
                f_unit = f_unit_MPa * 1000.0; 
                formula_str = `• 공식: min(0.65 &times; &alpha;<sub>E</sub> &times; P<sub>a</sub>(q<sub>u</sub>/P<sub>a</sub>)<sup>0.5</sup>, 7.8 &times; P<sub>a</sub>(f'<sub>c</sub>/P<sub>a</sub>)<sup>0.5</sup>)<br>• 계산: min(${(fs_MPa*1000).toFixed(1)}, ${(fs_limit_MPa*1000).toFixed(1)})<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
            } else if ((p_type === 'CAST' || p_type === 'CAST_ROCK') && qs_formula_key === 'oneill') {
                if (l.type === 'sand' || l.type === 'weathered_rock') {
                    let z_mm = z_mid * 1000.0;
                    let beta_calc = 1.5 - (7.7e-3 * Math.sqrt(z_mm));
                    let beta = N_60 > 15 ? beta_calc : (N_60 / 15.0) * beta_calc;
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `• 공식: min(190, &beta; &times; &sigma;'<sub>v</sub>)<br>• 계산: min(190, ${beta_clamped.toFixed(3)} &times; ${sigma_v_prime.toFixed(1)}) = min(190, ${calc_val.toFixed(1)})<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else if (l.type === 'gravel') {
                    let z_mm = z_mid * 1000.0;
                    let beta = 2.0 - 0.00082 * Math.pow(z_mm, 0.75);
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `• 공식: min(190, &beta; &times; &sigma;'<sub>v</sub>)<br>• 계산: min(190, ${beta_clamped.toFixed(3)} &times; ${sigma_v_prime.toFixed(1)}) = min(190, ${calc_val.toFixed(1)})<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else {
                    let calc_val = 0.55 * c_val_i;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `• 공식: min(190, 0.55 &times; c<sub>u</sub>)<br>• 계산: min(190, 0.55 &times; ${c_val_i}) = min(190, ${calc_val.toFixed(1)})<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                }
            } else { // AIJ
                let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(l.type);
                if (isGranular) {
                    let calc_val = 3.3 * l.n_val;
                    f_unit = calc_val;
                    formula_str = `• 공식: 3.3 &times; N<br>• 계산: 3.3 &times; ${l.n_val}<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else {
                    let calc_val = 1.0 * c_val_i;
                    f_unit = calc_val;
                    formula_str = `• 공식: 1.0 &times; c<sub>u</sub><br>• 계산: 1.0 &times; ${c_val_i}<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                }
            }

            let fxL = f_unit * dz_i;
            let Qus_i = fxL * As;
            total_Qus += Qus_i;

            layer_calc_rows.push({
                name: l.name, type: typeMap[l.type] || l.type,
                dz: dz_i, n_val: l.n_val, gamma: gamma_i, c_val: c_val_i, qu_val: qu_val_i,
                formula: formula_str, fxL: fxL, qusi: Qus_i
            });

            cum_depth += dz_i;
            cum_sigma_v += gamma_i * dz_i;
        });

        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        // 3. 구조 단면 내하력 (Qas)
        const Ac_gross = Ap; 
        const db_m = user_rebar_d_mm / 1000.0;
        const Ab_single = (Math.PI * Math.pow(db_m, 2)) / 4.0; 
        const Ast = user_rebar_count * Ab_single; 
        const Ac_net = Math.max(0, Ac_gross - Ast); 
        const A_net = Ac_gross;
        const fca_kNm2 = Math.min(0.25 * fck_eff, 8.5) * 1000.0; 
        const fsa_rebar_kNm2 = 0.40 * user_rebar_fy_MPa * 1000.0; 
        const Q_mat_base = (fca_kNm2 * Ac_net) + (fsa_rebar_kNm2 * Ast); 

        const L_over_D = L / D;
        let mu1 = Math.max(0, L_over_D - 60);
        const Qas = (1.0 - mu1 / 100.0) * Q_mat_base;

        const Q_app_norm = Math.min(Qa_soil_norm, Qas);
        const Q_app_seis = Math.min(Qa_soil_seis, Qas);
        const ratio_norm = (P_norm / Q_app_norm) * 100.0;
        const ratio_seis = (P_seis / Q_app_seis) * 100.0;

        let qMatBaseDetailStr = `
            • <strong>현장타설말뚝 장기허용압축강도 산정 :</strong><br>
            &nbsp;&nbsp;- 콘크리트 강도 조건: <strong>${conc_str_detail}</strong><br>
            &nbsp;&nbsp;- 말뚝 단면적 (A) = ${frac("&pi; &times; D²", "4")} = ${frac("&pi; &times; " + D.toFixed(3) + "²", "4")} = <strong>${Ac_gross.toFixed(4)} m²</strong><br>
            &nbsp;&nbsp;- 보강철근 단면적 (A<sub>st</sub>) = n &times; ${frac("&pi; &times; d<sub>b</sub>²", "4")} = ${user_rebar_count} &times; ${frac("&pi; &times; " + db_m.toFixed(4) + "²", "4")} = <strong>${Ast.toFixed(6)} m²</strong><br>
            &nbsp;&nbsp;- 콘크리트 순단면적 (A<sub>c</sub>) = A - A<sub>st</sub> = ${Ac_gross.toFixed(4)} - ${Ast.toFixed(6)} = <strong>${Ac_net.toFixed(4)} m²</strong><br>
            &nbsp;&nbsp;- 콘크리트 허용압축강도 (f<sub>ca</sub>) = min(0.25 &times; ${fck_eff.toFixed(1)}, 8.5 MPa) = <strong>${formatComma(fca_kNm2)} kN/m²</strong><br>
            &nbsp;&nbsp;- 총 기본 허용압축하중 (Q<sub>mat_base</sub>) = (f<sub>ca</sub> &times; A<sub>c</sub>) + (f<sub>sa,rebar</sub> &times; A<sub>st</sub>) = <strong>${formatComma(Q_mat_base, 1)} kN</strong>
        `;

        // 4. 수평 지반반력계수(kh) 축차계산 및 수평 지지력/변위 산정
        const Ip_cm4 = (Math.PI * Math.pow(D, 4)) / 64.0 * 1.0e8;
        const Z_m3 = (Math.PI * Math.pow(D, 3)) / 32.0;
        const horizRes = calculateHorizontalSoilReaction(alpha_norm_val, user_Ep, D, Ip_cm4, pileLayers); 

        const kh_norm = horizRes.applied_kh_norm;
        const beta_norm = horizRes.applied_beta_norm;
        const kh_seis = horizRes.applied_kh_seis;
        const beta_seis = horizRes.applied_beta_seis;

        const fy_kNm2 = fck_eff * 1000.0;
        const fy_detail_str = `현장타설말뚝 (${conc_str_detail}): f<sub>y</sub> = <strong>${formatComma(fy_kNm2)} kPa</strong>`;
        const My_kNm = fy_kNm2 * Z_m3; 

        const topLayer = pileLayers[0] || { c_val: 5, phi: 25, gamma: 18.5 };
        const phi_rad = ((topLayer.phi || 25) * Math.PI) / 180.0;
        const Kp = (1.0 + Math.sin(phi_rad)) / (1.0 - Math.sin(phi_rad));
        const gamma_sub = topLayer.gamma ? Math.max(8.5, topLayer.gamma - 9.807) : 8.5; 

        let chi_norm = 1.0 / beta_norm;
        let eta_h_norm = (kh_norm * D) / chi_norm;
        let eta_norm = Math.pow(eta_h_norm / horizRes.EI, 0.2);
        let etaL_norm = eta_norm * L;

        let chi_seis = 1.0 / beta_seis;
        let eta_h_seis = (kh_seis * D) / chi_seis;
        let eta_seis = Math.pow(eta_h_seis / horizRes.EI, 0.2);
        let etaL_seis = eta_seis * L;

        let Kp_gamma_D3 = Kp * gamma_sub * Math.pow(D, 3);
        let Kp_gamma_D4 = Kp * gamma_sub * Math.pow(D, 4);
        let My_ratio = My_kNm / Kp_gamma_D4;

        let Hu_norm = 2.38 * Math.pow(My_ratio, 2.0 / 3.0) * Kp_gamma_D3;
        let Hu_seis = 2.38 * Math.pow(My_ratio, 2.0 / 3.0) * Kp_gamma_D3;

        let Ha_broms_norm = Hu_norm / 3.0; 
        let Ha_broms_seis = Hu_seis / 2.0; 

        // Chang 탄성지반반력법 (상시/지진시 허용변위 분리 적용)
        const delta_sa_norm_m = allow_h_disp_norm / 1000.0; 
        const delta_sa_seis_m = allow_h_disp_seis / 1000.0; 
        let Ha_chang_norm = (head_cond === 'fixed' ? 2.0 : 1.0) * (kh_norm * D * delta_sa_norm_m) / beta_norm;
        let Ha_chang_seis = (head_cond === 'fixed' ? 2.0 : 1.0) * (kh_seis * D * delta_sa_seis_m) / beta_seis;

        let Ha_app_norm = Math.min(Ha_broms_norm, Ha_chang_norm);
        let Ha_norm_source = Ha_broms_norm <= Ha_chang_norm ? 'Broms법' : 'Chang법';

        let Ha_app_seis = Math.min(Ha_broms_seis, Ha_chang_seis);
        let Ha_seis_source = Ha_broms_seis <= Ha_chang_seis ? 'Broms법' : 'Chang법';

        const ratio_h_norm = (H_norm / Ha_app_norm) * 100.0;
        const ratio_h_seis = (H_seis / Ha_app_seis) * 100.0;

        // 발생 수평변위량
        let disp_norm_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_norm * beta_norm) / (kh_norm * D)) * 1000.0;
        let disp_seis_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_seis * beta_seis) / (kh_seis * D)) * 1000.0;

        const ratio_disp_norm = (disp_norm_mm / allow_h_disp_norm) * 100.0;
        const ratio_disp_seis = (disp_seis_mm / allow_h_disp_seis) * 100.0;

        // Broms 공식 Table 작성
        const isSand = ['sand', 'gravel', 'weathered_rock'].includes(topLayer.type);
        let betaL_val = beta_norm * L;
        let etaL_val = etaL_norm;
        let activeKey = "";
        if (isSand) {
            if (etaL_val < 2) activeKey = "sand_1";
            else if (etaL_val <= 4) activeKey = "sand_2";
            else activeKey = "sand_3";
        } else {
            if (betaL_val < 2.25) activeKey = "clay_1";
            else activeKey = "clay_3";
        }

        let bromsTableHtml = "";
        if (head_cond === 'fixed') {
            bromsTableHtml = `
            <div style="font-weight:bold; margin-top:10px; margin-bottom:4px; color:#2c3e50;">■ 극한지반 반력법에 의한 수평지지력 산정 (말뚝머리 구속)</div>
            <div class="table-container" style="margin: 5px 0;">
                <table class="result-table" style="font-size:0.83em; text-align:center; width:100%;">
                    <thead>
                        <tr style="background:#eaeded;">
                            <th style="width:12%;">지반</th>
                            <th style="width:18%;">구분</th>
                            <th>수평지지력, H<sub>u</sub> (kN)</th>
                            <th style="width:12%;">적용공식</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="${activeKey === 'clay_1' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td rowspan="3" style="vertical-align:middle;">점성토</td>
                            <td>&beta;L &lt; 2.25</td>
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = 9 c<sub>u</sub> D'² { (L/D') - 1.5 }</td>
                            <td>${activeKey === 'clay_1' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'clay_2' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>중간</td>
                            <td style="text-align:left; padding-left:10px;">(H<sub>u</sub> / c<sub>u</sub> D'²)² + (27 + 18L/D')(H<sub>u</sub> / c<sub>u</sub> D'²) - 81(L/D' - 1.5)² = 36(M<sub>y</sub> / c<sub>u</sub> D'³)</td>
                            <td>${activeKey === 'clay_2' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'clay_3' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>&beta;L &gt; 2.25</td>
                            <td style="text-align:left; padding-left:10px;">{H<sub>u</sub> / (c<sub>u</sub> D'²)}² + 27{H<sub>u</sub> / (c<sub>u</sub> D'²)} = 36(M<sub>y</sub> / c<sub>u</sub> D'³)</td>
                            <td>${activeKey === 'clay_3' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_1' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td rowspan="3" style="vertical-align:middle;">사질토</td>
                            <td>&eta;L &lt; 2</td>
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = 1.5 K<sub>p</sub> &gamma;' D' L²</td>
                            <td>${activeKey === 'sand_1' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_2' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>2 &le; &eta;L &le; 4</td>
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = K<sub>p</sub> D'³ &gamma;' { M<sub>y</sub> / (K<sub>p</sub> D'⁴ &gamma;') + 0.5(L/D')³ }(D'/L)</td>
                            <td>${activeKey === 'sand_2' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_3' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>&eta;L &gt; 4</td>
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = 2.38 (M<sub>y</sub> / (K<sub>p</sub> D'⁴ &gamma;'))<sup>2/3</sup> K<sub>p</sub> D'³ &gamma;'</td>
                            <td>${activeKey === 'sand_3' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
        } else {
            bromsTableHtml = `
            <div style="font-weight:bold; margin-top:10px; margin-bottom:4px; color:#2c3e50;">■ 극한지반 반력법에 의한 수평지지력 산정 (말뚝머리 자유)</div>
            <div class="table-container" style="margin: 5px 0;">
                <table class="result-table" style="font-size:0.83em; text-align:center; width:100%;">
                    <thead>
                        <tr style="background:#eaeded;">
                            <th style="width:12%;">지반</th>
                            <th style="width:18%;">구분</th>
                            <th>수평지지력, H<sub>u</sub> (kN)</th>
                            <th style="width:12%;">적용공식</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="${activeKey === 'clay_1' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td rowspan="3" style="vertical-align:middle;">점성토</td>
                            <td>&beta;L &lt; 2.25</td>
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = 9 c<sub>u</sub> D² [ {4(h/D)² + 2(L/D)² + 4(h/D)(L/D) + 6(h/D) + 4.5}<sup>1/2</sup> - {2(h/D) + L/D + 1.5} ]</td>
                            <td>${activeKey === 'clay_1' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'clay_2' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>중간</td>
                            <td style="text-align:left; padding-left:10px;">-</td>
                            <td>${activeKey === 'clay_2' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'clay_3' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>&beta;L &gt; 2.25</td>
                            <td style="text-align:left; padding-left:10px;">{H<sub>u</sub> / (c<sub>u</sub> D²)}² + {18(h/D) + 27}{H<sub>u</sub> / (c<sub>u</sub> D²)} = 18{M<sub>y</sub> / (c<sub>u</sub> D³)}</td>
                            <td>${activeKey === 'clay_3' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_1' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td rowspan="3" style="vertical-align:middle;">사질토</td>
                            <td>&eta;L &lt; 2</td>
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = (K<sub>p</sub> &gamma; D L²) / {2(1 + h/L)}</td>
                            <td>${activeKey === 'sand_1' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_2' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>2 &le; &eta;L &le; 4</td>
                            <td style="text-align:left; padding-left:10px;">-</td>
                            <td>${activeKey === 'sand_2' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_3' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>&eta;L &gt; 4</td>
                            <td style="text-align:left; padding-left:10px;">{H<sub>u</sub> / (K<sub>p</sub> &gamma; D³)} [ h/D + 0.544{H<sub>u</sub> / (K<sub>p</sub> &gamma; D³)}<sup>1/2</sup> ] = {M<sub>y</sub> / (K<sub>p</sub> &gamma; D⁴)}</td>
                            <td>${activeKey === 'sand_3' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
        }

        // 5. 연직 침하량 검토 (CAST: Vesic, CAST_ROCK: Pells & Turner)
        let settlementHtmlStr = "";
        let finalS_norm = 0, finalS_seis = 0;
        let settlementSummary = "";
        let ratio_settle_norm = 0, ratio_settle_seis = 0;

        if (p_type === 'CAST_ROCK') {
            let sumDr = 0, sumLs = 0, lastRockEs = 50000;
            pileLayers.forEach(l => {
                if(l.type === 'rock') {
                    sumDr += parseFloat(l.dz);
                    lastRockEs = parseFloat(l.es);
                } else {
                    sumLs += parseFloat(l.dz);
                }
            });
            if (sumDr === 0) sumDr = parseFloat(pileLayers[pileLayers.length - 1].dz);

            const D_r = sumDr;
            const B_r = D;
            const E_m = lastRockEs;
            const L_s = sumLs;
            
            const fcu = fck_eff + 4;
            const E_c_MPa = 8500 * Math.pow(fcu, 1/3); 
            const E_c = E_c_MPa * 1000; 

            const ec_em = E_c / E_m;
            const dr_br = D_r / B_r;
            const I_ps = getIps(dr_br, ec_em);

            finalS_norm = P_norm * ( (I_ps / (D_r * E_m)) + (L_s / (A_net * E_c)) ) * 1000;
            finalS_seis = P_seis * ( (I_ps / (D_r * E_m)) + (L_s / (A_net * E_c)) ) * 1000;

            ratio_settle_norm = (finalS_norm / allow_settle) * 100.0;
            ratio_settle_seis = (finalS_seis / allow_settle) * 100.0;

            const svgWidth = 600, svgHeight = 350;
            const padX = 60, padY = 40;
            const plotW = svgWidth - padX * 2, plotH = svgHeight - padY * 2;
            const logMin = -1; 
            const logMax = 0.477; 
            
            const getPx = (x) => padX + (Math.max(0, Math.min(5, x)) / 5.0) * plotW;
            const getPy = (y) => padY + plotH - ((Math.max(-1, Math.min(logMax, Math.log10(y))) - logMin) / (logMax - logMin)) * plotH;

            const gridLinesY = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2.0];
            let yGridStr = gridLinesY.map(y => {
                let py = getPy(y);
                return `<line x1="${padX}" y1="${py}" x2="${padX+plotW}" y2="${py}" stroke="#e0e0e0" stroke-width="1"/>
                        <text x="${padX-5}" y="${py+4}" font-size="11" text-anchor="end" fill="#555">${y.toFixed(1)}</text>`;
            }).join('');

            const gridLinesX = [0, 1, 2, 3, 4, 5];
            let xGridStr = gridLinesX.map(x => {
                let px = getPx(x);
                return `<line x1="${px}" y1="${padY}" x2="${px}" y2="${padY+plotH}" stroke="#e0e0e0" stroke-width="1"/>
                        <text x="${px}" y="${padY+plotH+15}" font-size="11" text-anchor="middle" fill="#555">${x}</text>`;
            }).join('');

            const curves = [
                { r: 0.2, color: '#34495e', pts: [[0, 0.53], [0.5, 1.15], [1, 1.30], [2, 1.35], [3, 1.38], [5, 1.42]] },
                { r: 0.5, color: '#34495e', pts: [[0, 0.53], [0.5, 0.65], [1, 0.68], [2, 0.70], [3, 0.71], [5, 0.72]] },
                { r: 1.0, color: '#34495e', pts: [[0, 0.53], [1, 0.53], [2, 0.53], [3, 0.53], [5, 0.53]] },
                { r: 2.0, color: '#34495e', pts: [[0, 0.53], [0.5, 0.42], [1, 0.38], [2, 0.36], [3, 0.35], [5, 0.34]] },
                { r: 10,  color: '#34495e', pts: [[0, 0.53], [0.5, 0.30], [1, 0.25], [2, 0.21], [3, 0.20], [5, 0.16]] },
                { r: 50,  color: '#34495e', pts: [[0, 0.53], [0.5, 0.28], [1, 0.21], [2, 0.15], [3, 0.13], [5, 0.08]] },
                { r: 1000, color: '#34495e', pts: [[0, 0.53], [0.5, 0.25], [1, 0.18], [2, 0.13], [3, 0.09], [5, 0.03]] }
            ];

            let pathStr = curves.map(c => {
                let d = c.pts.map((p, i) => `${i===0?'M':'L'} ${getPx(p[0])} ${getPy(p[1])}`).join(' ');
                let label = c.r === 1000 ? '∞' : c.r;
                let lastPt = c.pts[c.pts.length-2];
                return `<path d="${d}" fill="none" stroke="${c.color}" stroke-width="2"/>
                        <text x="${getPx(lastPt[0])}" y="${getPy(lastPt[1])-5}" font-size="11" font-weight="bold" fill="${c.color}">${label}</text>`;
            }).join('');

            const ptX = getPx(dr_br), ptY = getPy(I_ps);

            settlementSummary = `
                <tr>
                    <td rowspan="2" style="background:#f5eef8; font-weight:bold;">연직 침하량 검토</td>
                    <td>평상시 (상시)</td>
                    <td style="font-weight:bold; color:#8e44ad;">${finalS_norm.toFixed(2)} mm</td>
                    <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                    <td style="font-size:0.85em;">Pells & Turner (1979)</td>
                    <td style="font-weight:bold; color:${finalS_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_norm <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_norm.toFixed(1)}%)</td>
                </tr>
                <tr>
                    <td>내진시 (지진시)</td>
                    <td style="font-weight:bold; color:#8e44ad;">${finalS_seis.toFixed(2)} mm</td>
                    <td style="font-size:0.85em;">Pells & Turner (1979)</td>
                    <td style="font-weight:bold; color:${finalS_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_seis <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_seis.toFixed(1)}%)</td>
                </tr>
            `;

            settlementHtmlStr = `
                <div class="section-title">[상세검증 3] 현장타설말뚝(암반소켓) 연직침하량 산정 (Pells & Turner, 1979)</div>
                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                    <strong>■ 암반소켓 침하량 영향계수 (I<sub>ps</sub>) 산출</strong><br>
                    &nbsp;&nbsp;- 콘크리트 강도 조건: <strong>${conc_str_detail}</strong><br>
                    &nbsp;&nbsp;- 콘크리트 탄성계수 (E<sub>c</sub>) : 8500 &times; (${fck_eff.toFixed(1)}+4)<sup>1/3</sup> = <strong>${E_c.toExponential(3)} kPa</strong><br>
                    &nbsp;&nbsp;- 암반 변형계수 (E<sub>m</sub>) : <strong>${E_m.toExponential(3)} kPa</strong><br>
                    &nbsp;&nbsp;- 강성비 (${frac("E<sub>c</sub>", "E<sub>m</sub>")}) : ${frac(E_c.toExponential(3), E_m.toExponential(3))} = <strong>${ec_em.toFixed(2)}</strong><br>
                    &nbsp;&nbsp;- 근입비 (${frac("D<sub>r</sub>", "B<sub>r</sub>")}) : ${frac(D_r.toFixed(2), B_r.toFixed(2))} = <strong>${dr_br.toFixed(2)}</strong><br>
                    &nbsp;&nbsp;▶ 그래프 보간 산출 영향계수 (I<sub>ps</sub>) = <span style="font-weight:bold; color:#e67e22; font-size:1.1em;">${I_ps.toFixed(3)}</span><br>
                    
                    <div style="text-align:center; margin: 15px 0;">
                        <svg width="${svgWidth}" height="${svgHeight}" style="background:white; border:1px solid #bdc3c7; border-radius:4px;">
                            ${yGridStr} ${xGridStr} ${pathStr}
                            <rect x="${padX}" y="${padY}" width="${plotW}" height="${plotH}" fill="none" stroke="#2c3e50" stroke-width="2"/>
                            <text x="${padX-35}" y="${svgHeight/2}" transform="rotate(-90 ${padX-35},${svgHeight/2})" font-size="13" font-weight="bold">I_ps</text>
                            <text x="${svgWidth/2}" y="${svgHeight-10}" font-size="13" font-weight="bold">Dr / Br</text>
                            <circle cx="${ptX}" cy="${ptY}" r="6" fill="#e74c3c" stroke="white" stroke-width="2"/>
                            <text x="${ptX+10}" y="${ptY+4}" font-size="12" font-weight="bold" fill="#e74c3c">${I_ps.toFixed(3)}</text>
                        </svg>
                    </div>
                </div>

                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                    <strong>■ Pells & Turner 침하량 산정결과</strong><br>
                    &nbsp;&nbsp;- 공식: S<sub>t</sub> = Q &times; [ ${frac("I<sub>ps</sub>", "D<sub>r</sub> &times; E<sub>m</sub>")} + ${frac("L<sub>s</sub>", "A &times; E<sub>c</sub>")} ]<br>
                    &nbsp;&nbsp;- <strong>평상시 침하량</strong> = ${formatComma(P_norm, 1)} &times; [ ${frac(I_ps.toFixed(3), D_r.toFixed(2) + " &times; " + formatComma(E_m))} + ${frac(L_s.toFixed(2), A_net.toFixed(5) + " &times; " + E_c.toExponential(3))} ] &times; 1000 = <strong><span style="color:#8e44ad;">${finalS_norm.toFixed(3)} mm</span></strong><br>
                    &nbsp;&nbsp;- <strong>지진시 침하량</strong> = ${formatComma(P_seis, 1)} &times; [ ${frac(I_ps.toFixed(3), D_r.toFixed(2) + " &times; " + formatComma(E_m))} + ${frac(L_s.toFixed(2), A_net.toFixed(5) + " &times; " + E_c.toExponential(3))} ] &times; 1000 = <strong><span style="color:#8e44ad;">${finalS_seis.toFixed(3)} mm</span></strong>
                </div>
            `;
        } else {
            // CAST (Vesic 경험식)
            let Pp_norm = Qu_total > 0 ? P_norm * (Qup / Qu_total) : P_norm * 0.5;
            let Ps_norm = Qu_total > 0 ? P_norm * (total_Qus / Qu_total) : P_norm * 0.5;
            let Pp_seis = Qu_total > 0 ? P_seis * (Qup / Qu_total) : P_seis * 0.5;
            let Ps_seis = Qu_total > 0 ? P_seis * (total_Qus / Qu_total) : P_seis * 0.5;

            let isTipSand = ['sand', 'gravel', 'weathered_rock'].includes(lastLayer.type);
            let Cp = isTipSand ? 0.09 : 0.03; // 현장타설(굴착말뚝) 기준치 하한
            let Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
            let calc_qp = Math.max(q_p, 1.0);

            let S1_norm = ((Pp_norm + 0.5 * Ps_norm) * L) / (A_net * user_Ep) * 1000.0;
            let S2_norm = (Pp_norm * Cp) / (D * calc_qp) * 1000.0;
            let S3_norm = (Ps_norm * Cs) / (L * calc_qp) * 1000.0;
            finalS_norm = S1_norm + S2_norm + S3_norm;

            let S1_seis = ((Pp_seis + 0.5 * Ps_seis) * L) / (A_net * user_Ep) * 1000.0;
            let S2_seis = (Pp_seis * Cp) / (D * calc_qp) * 1000.0;
            let S3_seis = (Ps_seis * Cs) / (L * calc_qp) * 1000.0;
            finalS_seis = S1_seis + S2_seis + S3_seis;

            ratio_settle_norm = (finalS_norm / allow_settle) * 100.0;
            ratio_settle_seis = (finalS_seis / allow_settle) * 100.0;

            settlementSummary = `
                <tr>
                    <td rowspan="2" style="background:#f5eef8; font-weight:bold;">연직 침하량 검토</td>
                    <td>평상시 (상시)</td>
                    <td style="font-weight:bold; color:#8e44ad;">${finalS_norm.toFixed(2)} mm</td>
                    <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                    <td style="font-size:0.85em;">Vesic (1977) 경험식</td>
                    <td style="font-weight:bold; color:${finalS_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_norm <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_norm.toFixed(1)}%)</td>
                </tr>
                <tr>
                    <td>내진시 (지진시)</td>
                    <td style="font-weight:bold; color:#8e44ad;">${finalS_seis.toFixed(2)} mm</td>
                    <td style="font-size:0.85em;">Vesic (1977) 경험식</td>
                    <td style="font-weight:bold; color:${finalS_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_seis <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_seis.toFixed(1)}%)</td>
                </tr>
            `;

            settlementHtmlStr = `
                <div class="section-title">[상세검증 3] 토사층 현장타설말뚝 연직 경험적 침하량 산정 (Vesic, 1977)</div>
                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                    <strong>■ Vesic 경험적 침하 공식 (S = S<sub>1</sub> + S<sub>2</sub> + S<sub>3</sub>)</strong><br>
                    &nbsp;&nbsp;• <strong>S<sub>1</sub> (말뚝 본체 탄성변형량) :</strong> ${frac("(P<sub>p</sub> + 0.5 P<sub>s</sub>) &times; L", "A<sub>net</sub> &times; E<sub>p</sub>")}<br>
                    &nbsp;&nbsp;• <strong>S<sub>2</sub> (선단지반 침하량) :</strong> ${frac("P<sub>p</sub> &times; C<sub>p</sub>", "D &times; q<sub>p</sub>")}<br>
                    &nbsp;&nbsp;• <strong>S<sub>3</sub> (주면지반 침하량) :</strong> ${frac("P<sub>s</sub> &times; C<sub>s</sub>", "L &times; q<sub>p</sub>")}<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- 지반/시공조건 경험계수: C<sub>p</sub> = <strong>${Cp.toFixed(3)}</strong>, C<sub>s</sub> = [0.93 + 0.16&radic;(${frac("L","D")})] &times; C<sub>p</sub> = <strong>${Cs.toFixed(3)}</strong><br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- 극한 단위선단지지력 (q<sub>p</sub>) = <strong>${formatComma(calc_qp)} kPa</strong>
                </div>

                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                    <strong>■ 조건별 연직 침하량 산정 결과</strong><br>
                    &nbsp;&nbsp;• <strong>평상시 (P<sub>norm</sub> = ${formatComma(P_norm, 1)} kN) :</strong><br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- P<sub>p</sub> = ${formatComma(Pp_norm, 1)} kN, P<sub>s</sub> = ${formatComma(Ps_norm, 1)} kN<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- S<sub>1</sub> = <strong>${S1_norm.toFixed(2)} mm</strong>, S<sub>2</sub> = <strong>${S2_norm.toFixed(2)} mm</strong>, S<sub>3</sub> = <strong>${S3_norm.toFixed(2)} mm</strong><br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- <strong>총 발생침하량 (S<sub>norm</sub>)</strong> = <strong><span style="color:#8e44ad;">${finalS_norm.toFixed(2)} mm</span></strong> (&le; ${allow_settle.toFixed(1)} mm)<br><br>
                    &nbsp;&nbsp;• <strong>지진시 (P<sub>seis</sub> = ${formatComma(P_seis, 1)} kN) :</strong><br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- P<sub>p</sub> = ${formatComma(Pp_seis, 1)} kN, P<sub>s</sub> = ${formatComma(Ps_seis, 1)} kN<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- S<sub>1</sub> = <strong>${S1_seis.toFixed(2)} mm</strong>, S<sub>2</sub> = <strong>${S2_seis.toFixed(2)} mm</strong>, S<sub>3</sub> = <strong>${S3_seis.toFixed(2)} mm</strong><br>
                    &nbsp;&nbsp;&nbsp;&nbsp;- <strong>총 발생침하량 (S<sub>seis</sub>)</strong> = <strong><span style="color:#8e44ad;">${finalS_seis.toFixed(2)} mm</span></strong> (&le; ${allow_settle.toFixed(1)} mm)
                </div>
            `;
        }

        const resultDiv = container.querySelector('#pile-result');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';

        const initBHVal = Math.sqrt(D / 0.20000);

        resultDiv.innerHTML = `
            <div class="section-title">[현장타설말뚝 지지력, 수평력 및 침하/변위 최종 검토 요약]</div>
            <div class="table-container">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th colspan="2">검토 항목</th>
                            <th>산정값 (작용값)</th>
                            <th>기준값 (허용값)</th>
                            <th>적용 산정식</th>
                            <th>검토 결과</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowspan="2" style="background:#eaf2f8; font-weight:bold;">연직지지력 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${formatComma(P_norm, 1)} kN</td>
                            <td>${formatComma(Q_app_norm, 1)} kN</td>
                            <td style="font-size:0.85em;">지반 지지력 / 구조 내하력</td>
                            <td style="font-weight:bold; color:${P_norm <= Q_app_norm ? '#27ae60' : '#c0392b'};">${P_norm <= Q_app_norm ? 'O.K' : 'N.G'} (${ratio_norm.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${formatComma(P_seis, 1)} kN</td>
                            <td>${formatComma(Q_app_seis, 1)} kN</td>
                            <td style="font-size:0.85em;">지반 지지력 / 구조 내하력</td>
                            <td style="font-weight:bold; color:${P_seis <= Q_app_seis ? '#27ae60' : '#c0392b'};">${P_seis <= Q_app_seis ? 'O.K' : 'N.G'} (${ratio_seis.toFixed(1)}%)</td>
                        </tr>
                        ${settlementSummary}
                        <tr>
                            <td rowspan="2" style="background:#e8f8f5; font-weight:bold;">수평지지력 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#27ae60;">${formatComma(H_norm, 1)} kN</td>
                            <td>${formatComma(Ha_app_norm, 1)} kN</td>
                            <td style="font-size:0.85em; font-weight:bold; color:#2980b9;">${Ha_norm_source} (k<sub>h</sub>: ${horizRes.kh_norm_source})</td>
                            <td style="font-weight:bold; color:${H_norm <= Ha_app_norm ? '#27ae60' : '#c0392b'};">${H_norm <= Ha_app_norm ? 'O.K' : 'N.G'} (${ratio_h_norm.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#27ae60;">${formatComma(H_seis, 1)} kN</td>
                            <td>${formatComma(Ha_app_seis, 1)} kN</td>
                            <td style="font-size:0.85em; font-weight:bold; color:#2980b9;">${Ha_seis_source} (k<sub>h</sub>: ${horizRes.kh_seis_source})</td>
                            <td style="font-weight:bold; color:${H_seis <= Ha_app_seis ? '#27ae60' : '#c0392b'};">${H_seis <= Ha_app_seis ? 'O.K' : 'N.G'} (${ratio_h_seis.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#fef9e7; font-weight:bold;">수평 변위 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#d35400;">${disp_norm_mm.toFixed(2)} mm</td>
                            <td>${allow_h_disp_norm.toFixed(1)} mm</td>
                            <td style="font-size:0.85em;">Chang 탄성지반반력법</td>
                            <td style="font-weight:bold; color:${disp_norm_mm <= allow_h_disp_norm ? '#27ae60' : '#c0392b'};">${disp_norm_mm <= allow_h_disp_norm ? 'O.K' : 'N.G'} (${ratio_disp_norm.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#d35400;">${disp_seis_mm.toFixed(2)} mm</td>
                            <td>${allow_h_disp_seis.toFixed(1)} mm</td>
                            <td style="font-size:0.85em;">Chang 탄성지반반력법</td>
                            <td style="font-weight:bold; color:${disp_seis_mm <= allow_h_disp_seis ? '#27ae60' : '#c0392b'};">${disp_seis_mm <= allow_h_disp_seis ? 'O.K' : 'N.G'} (${ratio_disp_seis.toFixed(1)}%)</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section-title">[상세검증 1] 지반에 의한 연직 허용지지력 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
                • 단위면적당 극한선단지지력 q<sub>p</sub> :<br>
                <div style="margin-left: 15px; background: #fdf2e9; padding: 10px; border-radius: 4px; margin: 6px 0; line-height: 1.6; font-size: 0.9em; color: #2c3e50; border: 1px solid #fae5d3;">${qp_calc_detail}</div>
                • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = ${formatComma(q_p, 1)} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#2980b9;">${formatComma(Qup, 1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = &sum; (f<sub>s,i</sub> &times; L<sub>i</sub>) &times; A<sub>s</sub> = <span style="font-weight:bold; color:#2980b9;">${formatComma(total_Qus, 1)} kN</span>

                <div class="table-container" style="margin-top: 10px; margin-bottom: 5px;">
                    <table class="result-table" style="font-size: 0.88em; text-align: center;">
                        <thead>
                            <tr style="background-color: #eaeded;">
                                <th>지층명</th>
                                <th>토성구분</th>
                                <th>층후<br>(m)</th>
                                <th>N치 / &gamma; / qu(c)</th>
                                <th style="min-width: 320px;">단위 마찰력 f<sub>s</sub> 계산 과정 (kN/m²)</th>
                                <th>f<sub>s</sub> &times; L</th>
                                <th>Q<sub>us,i</sub> (kN)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${layer_calc_rows.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td>${r.type}</td>
                                    <td>${r.dz.toFixed(1)}</td>
                                    <td>${Math.round(r.n_val)} / ${r.gamma.toFixed(1)} / ${r.type === '기반암' ? Math.round(r.qu_val) : r.c_val.toFixed(1)}</td>
                                    <td style="text-align: left; padding: 6px 10px; line-height: 1.45;">${r.formula}</td>
                                    <td>${r.fxL.toFixed(1)}</td>
                                    <td style="font-weight:bold; color:#2980b9;">${formatComma(r.qusi, 1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #f5eef8; font-weight: bold;">
                                <td colspan="6">주면마찰력 합계 (&sum;)</td>
                                <td style="color:#27ae60; font-size:1.1em;">${formatComma(total_Qus, 1)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
                <strong>(3) 지반에 의한 극한지지력 및 허용지지력 (Q<sub>u</sub>, Q<sub>a,soil</sub>)</strong><br>
                • 극한지지력 Q<sub>u</sub> = Q<sub>up</sub> + Q<sub>us</sub> = <strong>${formatComma(Qu_total, 1)} kN</strong><br>
                • 평상시 허용지지력 (안전율 F.S = 3.0) : <strong>${formatComma(Qa_soil_norm, 1)} kN</strong><br>
                • 내진시 허용지지력 (안전율 F.S = 2.0) : <strong>${formatComma(Qa_soil_seis, 1)} kN</strong>
            </div>

            <div class="section-title">[상세검증 2] 현장타설말뚝 본체부 단면 내하력 (재료 허용압축하중 Q<sub>as</sub>) 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                ${qMatBaseDetailStr}<br>
                • 장경비 감소율 (&mu;) = max(0, ${L_over_D.toFixed(2)} - 60) = <strong>${mu1.toFixed(2)} %</strong><br>
                • <strong>말뚝 내하력 Q<sub>as</sub></strong> = (1 - ${frac("&mu;", "100")}) &times; Q<sub>mat_base</sub> = <span style="color:#2980b9; font-weight:bold; font-size:1.05em;">${formatComma(Qas, 1)} kN</span>
            </div>

            ${settlementHtmlStr}

            <div class="section-title">[상세검증 4] 수평방향 지지력 및 수평변위 상세 산정 (기초 구조계산)</div>
            
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>1. 수평지반반력계수 k<sub>h</sub> 산정 (구조물기초설계기준 축차계산법)</strong><br>
                &nbsp;&nbsp;• 공식: k<sub>h</sub> = k<sub>h0</sub> &times; ( ${frac("1", "0.3")} &times; B<sub>H</sub> )<sup>-3/4</sup> = { ${frac("1", "0.3")} &times; &alpha; &times; E<sub>0</sub> } &times; { ${frac("1", "0.3")} &times; (${frac("D", "&beta;")})<sup>1/2</sup> }<sup>-3/4</sup><br>
                &nbsp;&nbsp;• <strong>환산재하폭 (B<sub>H</sub>) 산정 공식 :</strong> B<sub>H</sub> = &radic;(${frac("D", "&beta;")})<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 초기가정 대입 계산: B<sub>H</sub> = &radic;(${frac(D.toFixed(3), "0.20000")}) = <strong>${initBHVal.toFixed(3)} m</strong><br>
                &nbsp;&nbsp;• [초기가정 &beta;<sub>0</sub> = 0.20000 m<sup>-1</sup>], <strong>[적용 추정계수 &alpha;: 평상시 = ${horizRes.alphaNorm}, 지진시 = ${horizRes.alphaSeis} (평상시의 2배)]</strong><br>

                <div style="font-weight:bold; margin-top:8px; color:#2c3e50;">(1) 평상시 축차계산 과정 (&alpha; = ${horizRes.alphaNorm})</div>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.82em; text-align:center;">
                        <thead>
                            <tr style="background:#eaf2f8;">
                                <th>구분</th><th>가정 &beta;</th><th>1/&beta; (m)</th><th>N<sub>1/&beta;</sub></th><th>E<sub>0</sub> (kPa)</th><th>k<sub>h</sub> (kN/m³)</th><th>계산 &beta;</th><th>오차율(%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${horizRes.stepsRoadNorm.map(s => `
                                <tr>
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${formatComma(Math.round(s.E0))}</td><td>${s.kh.toFixed(1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="font-weight:bold; margin-top:8px; color:#2c3e50;">(2) 지진시 축차계산 과정 (&alpha; = ${horizRes.alphaSeis})</div>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.82em; text-align:center;">
                        <thead>
                            <tr style="background:#eaf2f8;">
                                <th>구분</th><th>가정 &beta;</th><th>1/&beta; (m)</th><th>N<sub>1/&beta;</sub></th><th>E<sub>0</sub> (kPa)</th><th>k<sub>h</sub> (kN/m³)</th><th>계산 &beta;</th><th>오차율(%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${horizRes.stepsRoadSeis.map(s => `
                                <tr>
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${formatComma(Math.round(s.E0))}</td><td>${s.kh.toFixed(1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>2. 수평지반반력계수 k<sub>h</sub> 산정 (후쿠오카 공식 축차계산법 - 상시/지진시 공통)</strong><br>
                &nbsp;&nbsp;• 공식: k<sub>h</sub> = 0.691 &times; N<sup>0.406</sup> &times; 9,806.65 (kN/m³)<br>
                &nbsp;&nbsp;• [초기가정 &beta;<sub>0</sub> = 0.20000 m<sup>-1</sup>]<br>

                <div style="font-weight:bold; margin-top:8px; color:#2c3e50;">축차계산 과정 (후쿠오카 공식)</div>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.82em; text-align:center;">
                        <thead>
                            <tr style="background:#fef9e7;">
                                <th>구분</th><th>가정 &beta;</th><th>1/&beta; (m)</th><th>N<sub>1/&beta;</sub></th><th>k<sub>h</sub> (kN/m³)</th><th>계산 &beta;</th><th>오차율(%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${horizRes.stepsFukuoka.map(s => `
                                <tr>
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${s.kh.toFixed(1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <br>▶ <strong>최종 적용 k<sub>h</sub> (구조물기초설계기준 및 후쿠오카 공식 중 최소값 채택) :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시: k<sub>h</sub> = <strong><span style="color:#27ae60;">${kh_norm.toFixed(1)} kN/m³</span></strong> (&beta; = ${beta_norm.toFixed(5)} m<sup>-1</sup>) &rArr; <strong>[적용 산정식: ${horizRes.kh_norm_source}]</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시: k<sub>h</sub> = <strong><span style="color:#27ae60;">${kh_seis.toFixed(1)} kN/m³</span></strong> (&beta; = ${beta_seis.toFixed(5)} m<sup>-1</sup>) &rArr; <strong>[적용 산정식: ${horizRes.kh_seis_source}]</strong>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>3. Broms 극한평형법 매개변수 및 말뚝 길이 조건 판정</strong><br>
                &nbsp;&nbsp;• <strong>항복휨응력 (f<sub>y</sub>) 산정 :</strong> ${fy_detail_str}<br>
                &nbsp;&nbsp;• <strong>두부 구속조건 :</strong> ${head_cond === 'fixed' ? '두부고정 (Fixed)' : '두부자유 (Free)'}<br>
                &nbsp;&nbsp;• 하중 작용점 높이 h = 0.0 m<br>
                &nbsp;&nbsp;• 단면계수 (Z) = ${frac("&pi; &times; D³", "32")} = ${frac("&pi; &times; " + D.toFixed(3) + "³", "32")} = <strong>${Z_m3.toFixed(4)} m³</strong><br>
                &nbsp;&nbsp;• 항복모멘트 (M<sub>y</sub>) = f<sub>y</sub> &times; Z = ${formatComma(fy_kNm2)} &times; ${Z_m3.toFixed(4)} = <strong>${formatComma(My_kNm, 1)} kN·m</strong><br>
                &nbsp;&nbsp;• 수동토압계수 (K<sub>p</sub>) = ${frac("1 + sin&phi;", "1 - sin&phi;")} = ${frac("1 + sin(" + topLayer.phi + "°)", "1 - sin(" + topLayer.phi + "°)")} = <strong>${Kp.toFixed(3)}</strong><br>
                &nbsp;&nbsp;• 수중단위중량 (&gamma;') = &gamma;<sub>sat</sub> - &gamma;<sub>w</sub> = ${topLayer.gamma.toFixed(1)} - 9.807 = <strong>${gamma_sub.toFixed(1)} kN/m³</strong><br><br>
                &nbsp;&nbsp;• <strong>말뚝 특성치 &eta; 및 &eta;L 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 1/&beta; = ${chi_norm.toFixed(3)} m, 지반반력상수 n<sub>h</sub> = ${frac("k<sub>h</sub> &times; D", "1/&beta;")} = ${frac(kh_norm.toFixed(1) + " &times; " + D.toFixed(3), chi_norm.toFixed(3))} = <strong>${eta_h_norm.toFixed(1)} kN/m³</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&eta; = ( ${frac("n<sub>h</sub>", "EI")} )<sup>1/5</sup> = ( ${frac(eta_h_norm.toFixed(1), horizRes.EI.toFixed(1))} )<sup>1/5</sup> = <strong>${eta_norm.toFixed(3)} m<sup>-1</sup></strong> &rArr; &eta;L = ${eta_norm.toFixed(3)} &times; ${L.toFixed(1)} = <strong>${etaL_norm.toFixed(3)}</strong> ( <strong>&eta;L > 4.0 이므로 <u>긴말뚝</u> 판정</strong> )<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 1/&beta; = ${chi_seis.toFixed(3)} m, 지반반력상수 n<sub>h</sub> = ${frac("k<sub>h</sub> &times; D", "1/&beta;")} = ${frac(kh_seis.toFixed(1) + " &times; " + D.toFixed(3), chi_seis.toFixed(3))} = <strong>${eta_h_seis.toFixed(1)} kN/m³</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&eta; = ( ${frac("n<sub>h</sub>", "EI")} )<sup>1/5</sup> = ( ${frac(eta_h_seis.toFixed(1), horizRes.EI.toFixed(1))} )<sup>1/5</sup> = <strong>${eta_seis.toFixed(3)} m<sup>-1</sup></strong> &rArr; &eta;L = ${eta_seis.toFixed(3)} &times; ${L.toFixed(1)} = <strong>${etaL_seis.toFixed(3)}</strong> ( <strong>&eta;L > 4.0 이므로 <u>긴말뚝</u> 판정</strong> )
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>4. Broms 극한평형법 수평 지지력 산정 수식 및 계산 과정</strong><br>
                ${bromsTableHtml}<br>
                &nbsp;&nbsp;• <strong>선택된 적용 공식 대입 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- K<sub>p</sub> &gamma;' D³ = ${Kp.toFixed(3)} &times; ${gamma_sub.toFixed(1)} &times; ${D.toFixed(3)}³ = <strong>${formatComma(Kp_gamma_D3, 1)} kN</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- K<sub>p</sub> &gamma;' D⁴ = ${Kp.toFixed(3)} &times; ${gamma_sub.toFixed(1)} &times; ${D.toFixed(3)}⁴ = <strong>${formatComma(Kp_gamma_D4, 1)} kN·m</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- ${frac("M<sub>y</sub>", "K<sub>p</sub> &gamma;' D⁴")} = ${frac(formatComma(My_kNm, 1), formatComma(Kp_gamma_D4, 1))} = <strong>${My_ratio.toFixed(2)}</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- H<sub>u</sub> = 2.38 &times; (${My_ratio.toFixed(2)})<sup>2/3</sup> &times; ${formatComma(Kp_gamma_D3, 1)} = <strong>${formatComma(Hu_norm, 1)} kN/본</strong><br>
                &nbsp;&nbsp;• <strong>Broms 허용수평지지력 (H<sub>a</sub>) :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 H<sub>a</sub> = ${frac("H<sub>u</sub>", "3.0")} = ${frac(formatComma(Hu_norm, 1), "3.0")} = <strong>${formatComma(Ha_broms_norm, 1)} kN/본</strong> ( 안전율 F.S = 3.0 )<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 H<sub>a</sub> = ${frac("H<sub>u</sub>", "2.0")} = ${frac(formatComma(Hu_seis, 1), "2.0")} = <strong>${formatComma(Ha_broms_seis, 1)} kN/본</strong> ( 안전율 F.S = 2.0 )
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>5. Chang 탄성지반반력법 수평 지지력 산정 수식 및 계산 과정</strong><br>
                &nbsp;&nbsp;• <strong>허용변위 연동 허용수평지지력 공식 :</strong> H<sub>a</sub> = ${frac("k<sub>h</sub> &times; D &times; &delta;<sub>sa</sub>", "&beta;")}<br>
                &nbsp;&nbsp;• <strong>수치 대입 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 H<sub>a</sub> (&delta;<sub>sa</sub>=${allow_h_disp_norm.toFixed(1)}mm) = ${frac(kh_norm.toFixed(1) + " &times; " + D.toFixed(3) + " &times; " + delta_sa_norm_m.toFixed(4), beta_norm.toFixed(5))} = <strong><span style="color:#2980b9; font-weight:bold;">${formatComma(Ha_chang_norm, 1)} kN/본</span></strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 H<sub>a</sub> (&delta;<sub>sa</sub>=${allow_h_disp_seis.toFixed(1)}mm) = ${frac(kh_seis.toFixed(1) + " &times; " + D.toFixed(3) + " &times; " + delta_sa_seis_m.toFixed(4), beta_seis.toFixed(5))} = <strong><span style="color:#2980b9; font-weight:bold;">${formatComma(Ha_chang_seis, 1)} kN/본</span></strong>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>6. 수평 허용지지력 결과 비교 및 최종 적용값</strong><br>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.88em; text-align:center;">
                        <thead>
                            <tr style="background:#e8f8f5;">
                                <th>구분</th><th>Broms법 H<sub>a</sub> (kN)</th><th>Chang법 H<sub>a</sub> (kN)</th><th>최종 적용 H<sub>a</sub> (kN)</th><th>적용 산정식</th><th>작용 수평력 H (kN)</th><th>판정</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>평상시</td><td>${formatComma(Ha_broms_norm, 1)}</td><td>${formatComma(Ha_chang_norm, 1)}</td><td style="font-weight:bold; color:#27ae60;">${formatComma(Ha_app_norm, 1)}</td><td style="font-weight:bold; color:#2980b9;">${Ha_norm_source}</td><td>${formatComma(H_norm, 1)}</td><td style="font-weight:bold; color:${H_norm <= Ha_app_norm ? '#27ae60' : '#c0392b'};">${H_norm <= Ha_app_norm ? 'O.K' : 'N.G'} (${ratio_h_norm.toFixed(1)}%)</td>
                            </tr>
                            <tr>
                                <td>지진시</td><td>${formatComma(Ha_broms_seis, 1)}</td><td>${formatComma(Ha_chang_seis, 1)}</td><td style="font-weight:bold; color:#27ae60;">${formatComma(Ha_app_seis, 1)}</td><td style="font-weight:bold; color:#2980b9;">${Ha_seis_source}</td><td>${formatComma(H_seis, 1)}</td><td style="font-weight:bold; color:${H_seis <= Ha_app_seis ? '#27ae60' : '#c0392b'};">${H_seis <= Ha_app_seis ? 'O.K' : 'N.G'} (${ratio_h_seis.toFixed(1)}%)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>7. Chang 탄성식에 의한 지표면 수평발생변위량 (&delta;) 산정 및 검토</strong><br>
                &nbsp;&nbsp;• <strong>지표면 변위 산정 공식 :</strong> &delta; = ${frac("H &times; &beta;", "k<sub>h</sub> &times; D")} &times; 1000 (mm)<br>
                &nbsp;&nbsp;• <strong>수치 대입 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 발생변위 &delta;<sub>norm</sub> = ${frac(formatComma(H_norm, 1) + " &times; " + beta_norm.toFixed(5), kh_norm.toFixed(1) + " &times; " + D.toFixed(3))} &times; 1000 = <strong><span style="color:#d35400; font-weight:bold;">${disp_norm_mm.toFixed(2)} mm</span></strong> &le; ${allow_h_disp_norm.toFixed(1)} mm ( <strong>${disp_norm_mm <= allow_h_disp_norm ? 'O.K' : 'N.G'}</strong> )<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 발생변위 &delta;<sub>seis</sub> = ${frac(formatComma(H_seis, 1) + " &times; " + beta_seis.toFixed(5), kh_seis.toFixed(1) + " &times; " + D.toFixed(3))} &times; 1000 = <strong><span style="color:#d35400; font-weight:bold;">${disp_seis_mm.toFixed(2)} mm</span></strong> &le; ${allow_h_disp_seis.toFixed(1)} mm ( <strong>${disp_seis_mm <= allow_h_disp_seis ? 'O.K' : 'N.G'}</strong> )
            </div>
        `;
    }
}
