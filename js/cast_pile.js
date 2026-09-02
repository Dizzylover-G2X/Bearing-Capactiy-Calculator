// cast_pile.js
export function initCastPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_cast_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    const frac = (num, den) => '<span style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; margin:0 4px;"><span style="border-bottom:1px solid #2c3e50; padding:1px 4px;">' + num + '</span><span style="padding:1px 4px;">' + den + '</span></span>';

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
            .pl-input::-webkit-outer-spin-button,
            .pl-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .pl-input {
                -moz-appearance: textfield;
                width: 100%; box-sizing: border-box; padding: 4px; text-align: center;
                border: 1px solid #ccc; border-radius: 3px; font-size: 0.9em;
            }
            .pl-input:focus { border-color: #2980b9; outline: none; }
        </style>

        <h3>현장타설말뚝 기초 설계 (토사 및 기반암 소켓 검토)</h3>
        
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
                <input type="number" id="pile_D" value="${savedD}" step="10" placeholder="D(mm)" class="pl-input" style="height:32px; font-weight:bold;">
            </div>
            <div class="input-group" style="margin:0;">
                <label>콘크리트 f<sub>ck</sub> / 조건</label>
                <div style="display:flex; gap:3px; height:32px;">
                    <input type="number" id="pile_fck" value="${getVal('fck', '35')}" step="0.1" placeholder="fck(MPa)" class="pl-input" style="width:50%; height:100%;">
                    <select id="pile_conc_cond" style="width:50%; height:100%; box-sizing:border-box; padding:2px; font-size:0.8em;">
                        <option value="underwater" ${getVal('conc_cond', 'underwater') === 'underwater' ? 'selected' : ''}>수중 타설</option>
                        <option value="dry" ${getVal('conc_cond', 'underwater') === 'dry' ? 'selected' : ''}>비수중 타설</option>
                    </select>
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label style="font-size: 0.78em; white-space: nowrap;">허용압축응력 &sigma;<sub>ca</sub> (MPa)</label>
                <input type="number" id="grid5_val" value="${getVal('grid5_val', '35.0')}" step="0.1" class="pl-input" style="height:32px; font-weight:bold;">
            </div>
        </div>

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#d35400;">평상시 연직 P<sub>norm</sub> (kN)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '13791.2')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#c0392b;">지진시 연직 P<sub>seis</sub> (kN)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '15034.5')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#2980b9;">평상시 수평 H<sub>norm</sub> (kN)</label>
                <input type="number" id="pile_H_norm" value="${getVal('H_norm', '1496.2')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#8e44ad;">지진시 수평 H<sub>seis</sub> (kN)</label>
                <input type="number" id="pile_H_seis" value="${getVal('H_seis', '3784.7')}" step="0.1" class="pl-input">
            </div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad; font-size: 0.95em;">■ 수평 해석 및 허용 기준 조건</div>
        <div class="input-grid" style="margin-bottom: 10px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label>말뚝 두부 조건</label>
                <select id="pile_head_cond" style="width:100%; height:32px; box-sizing:border-box; padding:4px 2px; font-size:0.85em; text-align:center;">
                    <option value="free" ${getVal('head_cond', 'free') === 'free' ? 'selected' : ''}>두부 자유 (Free)</option>
                    <option value="fixed" ${getVal('head_cond', 'free') === 'fixed' ? 'selected' : ''}>두부 고정 (Fixed)</option>
                </select>
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#2980b9; font-size: 0.78em; white-space: nowrap;">추정계수 &alpha; (평상시)</label>
                <input type="number" id="pile_alpha_norm" value="${getVal('alpha_norm', '1.0')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#8e44ad; font-size: 0.78em; white-space: nowrap;">콘크리트 E<sub>p</sub> (kN/m²)</label>
                <input type="number" id="pile_Ep" value="${getVal('Ep', '26700000')}" step="100000" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#d4ac0d;">허용 연직 침하량 (mm)</label>
                <input type="number" id="pile_allow_settle" value="${getVal('allow_settle', '25.0')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#16a085;">허용 수평 변위량 (mm)</label>
                <input type="number" id="pile_allow_h_disp" value="${getVal('allow_h_disp', '30.0')}" step="0.1" class="pl-input">
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-weight: bold; color: #27ae60; font-size: 0.95em;">■ 지층 정보</span>
                <div style="display: flex; align-items: center; gap: 5px; font-size: 0.85em; color: #2c3e50; background: #eaf2f8; padding: 2px 8px; border-radius: 4px; border: 1px solid #aeb6bf;">
                    <label for="pile_gwt" style="font-weight: bold;">지하수위 GWT (GL. -m):</label>
                    <input type="number" id="pile_gwt" value="${initialGWT}" step="0.1" style="width: 55px; height: 22px; text-align: center; border: 1px solid #ccc; font-weight: bold;">
                </div>
            </div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 8px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0; overflow-x: auto;">
                <table class="result-table" style="font-size: 0.78em; text-align: center; margin: 0; width: 100%; min-width: 700px; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th style="width: 13%; padding: 4px;">지층명</th>
                            <th style="width: 13%; padding: 4px;">토성구분</th>
                            <th style="width: 7%; padding: 4px;">층후<br>(m)</th>
                            <th style="width: 7%; padding: 4px;">N치</th>
                            <th style="width: 9%; padding: 4px;">&gamma;<br>(kN/m³)</th>
                            <th style="width: 9%; padding: 4px;">점착력 c<br>(kPa)</th>
                            <th style="width: 9%; padding: 4px;">마찰각 &phi;<br>(°)</th>
                            <th style="width: 14%; padding: 4px;">변형계수 E<sub>s</sub><br>(kPa)</th>
                            <th style="width: 12%; padding: 4px;">일축강도 q<sub>u</sub><br>(kPa)</th>
                            <th style="width: 5%; padding: 4px;">삭제</th>
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
            else qpText = "q<sub>p</sub> = [&radic;s + &radic;(m &times; &radic;s + s)] &times; q<sub>u</sub> (Hoek-Brown 1988 적용)";
            qsText = "토사: AASHTO LRFD (2012) &beta; 방법 / 암반: Horvath & Kenney (1979) [f<sub>s</sub> = 0.65 &times; &alpha;<sub>E</sub> &times; P<sub>a</sub> &times; (q<sub>u</sub>/P<sub>a</sub>)<sup>0.5</sup>]";
        } else {
            if (qpVal === 'oneill') qpText = "57.4 &times; N (N&le;75) / 4,309.2 kN/m² (N>75) [O'Neill & Reese (1999)]";
            else qpText = "100 &times; N_bar (사질토) / 6 &times; c<sub>u</sub> (점성토) [건축기초 구조설계지침]";
            if (qsVal === 'oneill') qsText = "AASHTO LRFD (2012) &beta; 산정식 적용 (상한 190 kPa)";
            else qsText = "3.3 &times; N (사질토) / 1.0 &times; c<sub>u</sub> (점성토) [건축기초 구조설계지침]";
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 2px;">▶ 적용 산정식 개요</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>연직 선단지지력 :</strong> ${qpText}<br>
                • <strong>연직 주면마찰력 :</strong> ${qsText}<br>
                • <strong>침하량 산정 :</strong> Pells & Turner (1979) 암반소켓 탄성침하 공식 적용<br>
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
                    <input type="number" id="pile_rqd" value="${getVal('rqd', '4.0')}" step="0.1" class="pl-input" style="height:32px;">
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
                        <option value="oneill" selected>O'Neill & Reese (1999)</option>
                        <option value="aij">건축기초 구조설계지침 (2004)</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>주면마찰력 산정식</label>
                    <select id="pile_qs_formula" style="width:100%; height:32px; padding:4px; font-size:0.82em;">
                        <option value="oneill" selected>AASHTO LRFD (2012)</option>
                        <option value="aij">건축기초 구조설계지침 (2004)</option>
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

    container.addEventListener('change', (e) => {
        if (e.target.id === 'pile_type') {
            updateUIState();
            renderLayers();
            try { localStorage.setItem('geo_cast_pile_type', e.target.value); } catch(err){}
        } else if (['pile_qp_formula', 'pile_qs_formula', 'pile_rmr', 'grid5_val', 'pile_fck', 'pile_conc_cond', 'pile_joint_state', 'pile_rqd', 'pile_rebar_d', 'pile_rebar_fy', 'pile_rebar_count', 'pile_alpha_norm', 'pile_Ep', 'pile_allow_settle', 'pile_allow_h_disp', 'pile_head_cond', 'pile_H_norm', 'pile_H_seis', 'pile_D'].includes(e.target.id)) {
            try { localStorage.setItem('geo_cast_pile_' + e.target.id, e.target.value); } catch(err){}
            if (e.target.id.includes('formula')) updateFormulaInfoText();
        }

        if (e.target.id === 'pile_gwt') {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            try { localStorage.setItem('geo_cast_pile_gwt', e.target.value); } catch(err){}
        }
        if (e.target.classList.contains('pl-name')) pileLayers[e.target.dataset.idx].name = e.target.value;
        if (e.target.classList.contains('pl-type')) pileLayers[e.target.dataset.idx].type = e.target.value;
        if (e.target.classList.contains('pl-dz')) {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].dz = val;
            updatePileLength();
        }
        if (e.target.classList.contains('pl-n')) {
            const val = Math.round(parseFloat(e.target.value) || 0);
            e.target.value = val.toFixed(0);
            pileLayers[e.target.dataset.idx].n_val = val;
        }
        if (e.target.classList.contains('pl-gamma')) {
            const val = parseFloat(e.target.value) || 19.0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].gamma = val;
        }
        if (e.target.classList.contains('pl-c')) {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].c_val = val;
        }
        if (e.target.classList.contains('pl-phi')) {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].phi = val;
        }
        if (e.target.classList.contains('pl-es')) {
            const val = Math.round(parseFloat(e.target.value) || 0);
            e.target.value = val.toFixed(0);
            pileLayers[e.target.dataset.idx].es = val;
        }
        if (e.target.classList.contains('pl-qu')) {
            const val = Math.round(parseFloat(e.target.value) || 0);
            e.target.value = val.toFixed(0);
            pileLayers[e.target.dataset.idx].qu_val = val;
        }
        
        try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
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
            const rockOptionHtml = currentPileType === 'CAST' ? '' : `<option value="rock" ${l.type === 'rock' ? 'selected' : ''}>기반암(연암)</option>`;

            tbody.innerHTML += `
                <tr>
                    <td style="padding:2px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name pl-input"></td>
                    <td style="padding:2px;">
                        <select data-idx="${idx}" class="pl-type pl-input" style="font-size:0.85em;">
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
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.es)).toFixed(0)}" data-idx="${idx}" class="pl-es pl-input" step="1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.qu_val)).toFixed(0)}" data-idx="${idx}" class="pl-qu pl-input" step="1"></td>
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
        let kh_norm_source = kh_road_norm <= kh_fukuoka ? '도로교 표준시방서' : '후쿠오카 공식';

        let applied_kh_seis = Math.min(kh_road_seis, kh_fukuoka);
        let applied_beta_seis = Math.pow((applied_kh_seis * D) / (4.0 * EI), 0.25);
        let kh_seis_source = kh_road_seis <= kh_fukuoka ? '도로교 표준시방서' : '후쿠오카 공식';

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

        const D_mm = parseFloat(container.querySelector('#pile_D').value) || 3000;
        const D = D_mm / 1000.0;
        const gwt = parseFloat(container.querySelector('#pile_gwt')?.value) || 3.1;
        const allow_settle = parseFloat(container.querySelector('#pile_allow_settle')?.value) || 25.0;
        const allow_h_disp = parseFloat(container.querySelector('#pile_allow_h_disp')?.value) || 30.0;
        const head_cond = container.querySelector('#pile_head_cond')?.value || 'free';
        const alpha_norm_val = parseFloat(container.querySelector('#pile_alpha_norm')?.value) || 1.0;

        const user_fck = parseFloat(container.querySelector('#pile_fck')?.value) || 35.0;
        const conc_cond = container.querySelector('#pile_conc_cond')?.value || 'underwater';
        const user_rebar_d_mm = parseFloat(container.querySelector('#pile_rebar_d')?.value) || 38.10;
        const user_rebar_fy_MPa = parseFloat(container.querySelector('#pile_rebar_fy')?.value) || 400;
        const user_rebar_count = parseInt(container.querySelector('#pile_rebar_count')?.value) || 0;

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
            const user_rqd = parseFloat(container.querySelector('#pile_rqd')?.value) || 4.0;
            em_ei_val = interpolateEmEi(user_rqd, user_joint_state);
            alpha_e_val = interpolateAlphaE(em_ei_val);
        }

        const L = calcTotalL();
        const P_norm = parseFloat(container.querySelector('#pile_P_norm').value) || 0;
        const P_seis = parseFloat(container.querySelector('#pile_P_seis').value) || 0;
        const H_norm = parseFloat(container.querySelector('#pile_H_norm').value) || 0;
        const H_seis = parseFloat(container.querySelector('#pile_H_seis').value) || 0;
        const user_Ep = parseFloat(container.querySelector('#pile_Ep')?.value) || 26700000;

        // 1. 연직 선단지지력 (Qup)
        let lastLayer = pileLayers[pileLayers.length - 1] || { name: '지반', n_val: 50, qu_val: 30000 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let qu_tip = parseFloat(lastLayer.qu_val) || 0;
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 
        let qp_calc_detail = "";

        if (p_type === 'CAST_ROCK') {
            if (qp_formula_key === 'rock_case1') {
                q_p = 2.5 * qu_tip;
                qp_calc_detail = `q<sub>p</sub> = 2.5 &times; q<sub>u</sub> = 2.5 &times; ${qu_tip} = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                let hb_mi = parseInt(container.querySelector('#pile_rock_type')?.value) || 17;
                let input_rmr = parseFloat(container.querySelector('#pile_rmr')?.value) || 30;
                let hbRes = interpolateHoekBrown(input_rmr, hb_mi);
                let hb_m = hbRes.m, hb_s = hbRes.s;
                let factor = Math.sqrt(hb_s) + Math.sqrt(hb_m * Math.sqrt(hb_s) + hb_s);
                q_p = factor * qu_tip;
                qp_calc_detail = `q<sub>p</sub> = [&radic;s + &radic;(m&radic;s + s)] &times; q<sub>u</sub> = [&radic;${hb_s.toExponential(3)} + &radic;(${hb_m.toFixed(4)}&times;&radic;${hb_s.toExponential(3)} + ${hb_s.toExponential(3)})] &times; ${qu_tip} = ${factor.toFixed(4)} &times; ${qu_tip} = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            }
        } else {
            q_p = raw_N_tip <= 75 ? 57.4 * raw_N_tip : 4309.2;
            qp_calc_detail = `q<sub>p</sub> = ${raw_N_tip <= 75 ? "57.4 &times; N" : "4309.2"} = ${raw_N_tip <= 75 ? `57.4 &times; ${raw_N_tip}` : "4309.2"} = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
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
                formula_str = `f<sub>s</sub> = min(0.65 &times; &alpha;<sub>E</sub> &times; P<sub>a</sub>(q<sub>u</sub>/P<sub>a</sub>)<sup>0.5</sup>, 7.8 &times; P<sub>a</sub>(f'<sub>c</sub>/P<sub>a</sub>)<sup>0.5</sup>) = min(${(fs_MPa*1000).toFixed(1)}, ${(fs_limit_MPa*1000).toFixed(1)}) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
            } else {
                if (l.type === 'sand' || l.type === 'weathered_rock') {
                    let z_mm = z_mid * 1000.0;
                    let beta_calc = 1.5 - (7.7e-3 * Math.sqrt(z_mm));
                    let beta = N_60 > 15 ? beta_calc : (N_60 / 15.0) * beta_calc;
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `f<sub>s</sub> = min(190, &beta; &times; &sigma;'<sub>v</sub>) = min(190, ${beta_clamped.toFixed(3)} &times; ${sigma_v_prime.toFixed(1)}) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else if (l.type === 'gravel') {
                    let z_mm = z_mid * 1000.0;
                    let beta = 2.0 - 0.00082 * Math.pow(z_mm, 0.75);
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `f<sub>s</sub> = min(190, &beta; &times; &sigma;'<sub>v</sub>) = min(190, ${beta_clamped.toFixed(3)} &times; ${sigma_v_prime.toFixed(1)}) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else {
                    let calc_val = 0.55 * c_val_i;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `f<sub>s</sub> = min(190, 0.55 &times; c<sub>u</sub>) = min(190, 0.55 &times; ${c_val_i}) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                }
            }

            let fxL = f_unit * dz_i;
            let Qus_i = fxL * As;
            total_Qus += Qus_i;

            layer_calc_rows.push({
                name: l.name, type: typeMap[l.type] || l.type,
                dz: dz_i, n_val: l.n_val, gamma: gamma_i, c_val: c_val_i, qu_val: qu_val_i,
                z_mid: z_mid, sigma_v_prime: sigma_v_prime,
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
        const status_norm = P_norm <= Q_app_norm ? "안정 (O.K)" : "NG";
        const status_seis = P_seis <= Q_app_seis ? "안정 (O.K)" : "NG";

        // 4. 수평해석 및 침하량
        const Ip_cm4 = (Math.PI * Math.pow(D, 4)) / 64.0 * 1.0e8;
        const Z_m3 = (Math.PI * Math.pow(D, 3)) / 32.0;
        const horizRes = calculateHorizontalSoilReaction(alpha_norm_val, user_Ep, D, Ip_cm4, pileLayers); 

        const kh_norm = horizRes.applied_kh_norm;
        const beta_norm = horizRes.applied_beta_norm;
        const kh_seis = horizRes.applied_kh_seis;
        const beta_seis = horizRes.applied_beta_seis;

        const fy_kNm2 = fck_eff * 1000.0;
        const My_kNm = fy_kNm2 * Z_m3; 

        const topLayer = pileLayers[0] || { c_val: 5, phi: 25, gamma: 18.5 };
        const phi_rad = ((topLayer.phi || 25) * Math.PI) / 180.0;
        const Kp = (1.0 + Math.sin(phi_rad)) / (1.0 - Math.sin(phi_rad));
        const gamma_sub = topLayer.gamma ? Math.max(8.5, topLayer.gamma - 9.807) : 8.5; 

        let Kp_gamma_D3 = Kp * gamma_sub * Math.pow(D, 3);
        let Kp_gamma_D4 = Kp * gamma_sub * Math.pow(D, 4);
        let My_ratio = My_kNm / Kp_gamma_D4;

        let Hu_norm = 2.38 * Math.pow(My_ratio, 2.0 / 3.0) * Kp_gamma_D3;
        let Ha_broms_norm = Hu_norm / 3.0; 
        let Ha_broms_seis = Hu_norm / 2.0; 

        const delta_sa_m = allow_h_disp / 1000.0; 
        let Ha_chang_norm = (head_cond === 'fixed' ? 2.0 : 1.0) * (kh_norm * D * delta_sa_m) / beta_norm;
        let Ha_chang_seis = (head_cond === 'fixed' ? 2.0 : 1.0) * (kh_seis * D * delta_sa_m) / beta_seis;

        let Ha_app_norm = Math.min(Ha_broms_norm, Ha_chang_norm);
        let Ha_app_seis = Math.min(Ha_broms_seis, Ha_chang_seis);

        let disp_norm_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_norm * beta_norm) / (kh_norm * D)) * 1000.0;
        let disp_seis_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_seis * beta_seis) / (kh_seis * D)) * 1000.0;

        // 침하량 산정 (Pells & Turner)
        let sumDr = 0, sumLs = 0, lastRockEs = 50000;
        pileLayers.forEach(l => {
            if(l.type === 'rock') { sumDr += parseFloat(l.dz); lastRockEs = parseFloat(l.es); }
            else { sumLs += parseFloat(l.dz); }
        });
        if (sumDr === 0) sumDr = parseFloat(pileLayers[pileLayers.length - 1].dz);

        const D_r = sumDr;
        const B_r = D;
        const E_m = lastRockEs;
        const L_s = sumLs;
        
        const E_c = (8500 * Math.pow(fck_eff + 4, 1/3)) * 1000;
        const ec_em = E_c / E_m;
        const dr_br = D_r / B_r;
        const I_ps = getIps(dr_br, ec_em);

        const finalS_norm = P_norm * ( (I_ps / (D_r * E_m)) + (L_s / (A_net * E_c)) ) * 1000;
        const finalS_seis = P_seis * ( (I_ps / (D_r * E_m)) + (L_s / (A_net * E_c)) ) * 1000;

        const resultDiv = container.querySelector('#pile-result');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';

        resultDiv.innerHTML = `
            <div class="section-title">[현장타설말뚝 지지력 및 침하량 종합산정 결과 요약]</div>
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
                            <td style="font-weight:bold; color:#2980b9;">${P_norm.toFixed(1)} kN</td>
                            <td>${Q_app_norm.toFixed(1)} kN</td>
                            <td style="font-size:0.85em;">지반 지지력 / 구조 내하력</td>
                            <td style="font-weight:bold; color:${P_norm <= Q_app_norm ? '#27ae60' : '#c0392b'};">${status_norm}</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${P_seis.toFixed(1)} kN</td>
                            <td>${Q_app_seis.toFixed(1)} kN</td>
                            <td style="font-size:0.85em;">지반 지지력 / 구조 내하력</td>
                            <td style="font-weight:bold; color:${P_seis <= Q_app_seis ? '#27ae60' : '#c0392b'};">${status_seis}</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#f5eef8; font-weight:bold;">연직 침하량 검토</td>
                            <td>평상시 (Pells & Turner)</td>
                            <td style="font-weight:bold; color:#8e44ad;">${finalS_norm.toFixed(2)} mm</td>
                            <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                            <td style="font-size:0.85em;">Pells & Turner (1979)</td>
                            <td style="font-weight:bold; color:${finalS_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_norm <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td>지진시 (Pells & Turner)</td>
                            <td style="font-weight:bold; color:#8e44ad;">${finalS_seis.toFixed(2)} mm</td>
                            <td style="font-size:0.85em;">Pells & Turner (1979)</td>
                            <td style="font-weight:bold; color:${finalS_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_seis <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#e8f8f5; font-weight:bold;">수평지지력 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#27ae60;">${H_norm.toFixed(1)} kN</td>
                            <td>${Ha_app_norm.toFixed(1)} kN</td>
                            <td style="font-size:0.85em;">Broms / Chang 공법</td>
                            <td style="font-weight:bold; color:${H_norm <= Ha_app_norm ? '#27ae60' : '#c0392b'};">${H_norm <= Ha_app_norm ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#27ae60;">${H_seis.toFixed(1)} kN</td>
                            <td>${Ha_app_seis.toFixed(1)} kN</td>
                            <td style="font-size:0.85em;">Broms / Chang 공법</td>
                            <td style="font-weight:bold; color:${H_seis <= Ha_app_seis ? '#27ae60' : '#c0392b'};">${H_seis <= Ha_app_seis ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#fef9e7; font-weight:bold;">수평 변위 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#d35400;">${disp_norm_mm.toFixed(2)} mm</td>
                            <td rowspan="2" style="vertical-align: middle;">${allow_h_disp.toFixed(1)} mm</td>
                            <td style="font-size:0.85em;">Chang 탄성지반반력법</td>
                            <td style="font-weight:bold; color:${disp_norm_mm <= allow_h_disp ? '#27ae60' : '#c0392b'};">${disp_norm_mm <= allow_h_disp ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#d35400;">${disp_seis_mm.toFixed(2)} mm</td>
                            <td style="font-size:0.85em;">Chang 탄성지반반력법</td>
                            <td style="font-weight:bold; color:${disp_seis_mm <= allow_h_disp ? '#27ae60' : '#c0392b'};">${disp_seis_mm <= allow_h_disp ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section-title">[상세검증 1] 연직 지반지반지지력 산정식 및 상세 내역</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
                <div style="margin-left: 15px; background: #fdf2e9; padding: 8px; border-radius: 4px; margin: 6px 0; font-size: 0.9em; border: 1px solid #fae5d3;">${qp_calc_detail}</div>
                • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = ${q_p.toFixed(1)} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#2980b9;">${Qup.toFixed(1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = <span style="font-weight:bold; color:#2980b9;">${total_Qus.toFixed(1)} kN</span>
                <div class="table-container" style="margin-top: 6px;">
                    <table class="result-table" style="font-size: 0.88em; text-align: center;">
                        <thead>
                            <tr style="background-color: #eaeded;">
                                <th>지층명</th><th>토성구분</th><th>층후(m)</th><th>단위 마찰력 f<sub>s</sub> 계산식</th><th>Q<sub>us,i</sub> (kN)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${layer_calc_rows.map(r => `
                                <tr>
                                    <td>${r.name}</td><td>${r.type}</td><td>${r.dz.toFixed(1)}</td>
                                    <td style="text-align: left; padding: 4px 8px;">${r.formula}</td>
                                    <td style="font-weight:bold; color:#2980b9;">${r.qusi.toFixed(1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section-title">[상세검증 2] 단면 내하력 및 Pells & Turner 침하량 검토</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; line-height: 1.6;">
                • 콘크리트 설계강도: <strong>${conc_str_detail}</strong><br>
                • 철근 단면적 A<sub>st</sub> = <strong>${Ast.toFixed(6)} m²</strong> (${user_rebar_count}개)<br>
                • 허용 구조 압축하중 Q<sub>as</sub> = <strong>${Qas.toFixed(1)} kN</strong><br>
                • 암반 소켓 영향계수 (I<sub>ps</sub>) = <strong>${I_ps.toFixed(3)}</strong> (E<sub>c</sub>/E<sub>m</sub> = ${ec_em.toFixed(2)}, D<sub>r</sub>/B<sub>r</sub> = ${dr_br.toFixed(2)})<br>
                • <strong>발생 연직 침하량 S<sub>norm</sub></strong> = <strong><span style="color:#8e44ad;">${finalS_norm.toFixed(2)} mm</span></strong> (&le; ${allow_settle.toFixed(1)} mm)
            </div>
        `;
    }
}
