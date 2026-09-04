// cast_pile.js
export function initCastPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_cast_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

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
            .pl-input { -moz-appearance: textfield; width: 100%; box-sizing: border-box; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 3px; font-size: 0.85em; font-weight: normal; }
            .pl-input:focus { border-color: #2980b9; outline: none; }
            .grid-label { font-size: 0.85em; font-weight: normal; color: #2c3e50; margin-bottom: 3px; display: block; }
            .grid-select { width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.85em; font-weight: normal; border: 1px solid #ccc; border-radius: 3px; }
        </style>

        <h3>현장타설말뚝 기초 검토</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label class="grid-label">지지층</label>
                <select id="pile_type" class="grid-select">
                    <option value="CAST_ROCK" ${initialType === 'CAST_ROCK' ? 'selected' : ''}>기반암</option>
                    <option value="CAST" ${initialType === 'CAST' ? 'selected' : ''}>토사/풍화암</option>
                </select>
            </div>
            <div class="input-group" style="margin:0;">
                <label class="grid-label" id="grid2_label">암의 유형 / RMR</label>
                <div id="grid2_content" style="height:32px; display:flex; align-items:center;"></div>
            </div>
            <div class="input-group" style="margin:0;">
                <label class="grid-label">말뚝 직경 D (mm)</label>
                <input type="text" id="pile_D" value="${formatComma(savedD)}" placeholder="D(mm)" class="pl-input comma-input" style="height:32px;">
            </div>
            <div class="input-group" style="margin:0;">
                <label class="grid-label">콘크리트 f<sub>ck</sub> / 조건</label>
                <div style="display:flex; gap:3px; height:32px;">
                    <input type="text" id="pile_fck" value="${formatComma(getVal('fck', '35'), 1)}" placeholder="fck(MPa)" class="pl-input dec-input" style="width:50%; height:100%;">
                    <select id="pile_conc_cond" class="grid-select" style="width:50%; height:100%; padding:2px;">
                        <option value="underwater" ${getVal('conc_cond', 'underwater') === 'underwater' ? 'selected' : ''}>수중 타설</option>
                        <option value="dry" ${getVal('conc_cond', 'underwater') === 'dry' ? 'selected' : ''}>비수중 타설</option>
                    </select>
                </div>
            </div>
        </div>

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 10px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;"><label class="grid-label" style="color:#d35400;">평상시 연직 P<sub>norm</sub> (kN)</label><input type="text" id="pile_P_norm" value="${formatComma(getVal('P_norm', '13791.2'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label class="grid-label" style="color:#c0392b;">지진시 연직 P<sub>seis</sub> (kN)</label><input type="text" id="pile_P_seis" value="${formatComma(getVal('P_seis', '15034.5'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label class="grid-label" style="color:#2980b9;">평상시 수평 H<sub>norm</sub> (kN)</label><input type="text" id="pile_H_norm" value="${formatComma(getVal('H_norm', '1496.2'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label class="grid-label" style="color:#8e44ad;">지진시 수평 H<sub>seis</sub> (kN)</label><input type="text" id="pile_H_seis" value="${formatComma(getVal('H_seis', '3784.7'), 1)}" class="pl-input dec-input"></div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad; font-size: 0.95em;">■ 수평 해석 및 허용 기준 조건</div>
        <div class="input-grid" style="margin-bottom: 8px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label class="grid-label">말뚝 두부조건 / 1/&beta; 지층</label>
                <div style="display:flex; gap:3px; height:32px;">
                    <select id="pile_head_cond" class="grid-select" style="width:50%; height:100%;">
                        <option value="free" ${getVal('head_cond', 'free') === 'free' ? 'selected' : ''}>두부 자유</option>
                        <option value="fixed" ${getVal('head_cond', 'free') === 'fixed' ? 'selected' : ''}>두부 고정</option>
                    </select>
                    <select id="pile_beta_soil" class="grid-select" style="width:50%; height:100%;">
                        <option value="sand" ${getVal('beta_soil', 'sand') === 'sand' ? 'selected' : ''}>사질토</option>
                        <option value="clay" ${getVal('beta_soil', 'sand') === 'clay' ? 'selected' : ''}>점성토</option>
                    </select>
                </div>
            </div>
            <div class="input-group" style="background:#fff; margin:0;"><label class="grid-label" style="color:#2980b9;">추정계수 &alpha; (상시)</label><input type="text" id="pile_alpha_norm" value="${formatComma(getVal('alpha_norm', '1.0'), 1)}" class="pl-input dec-input"></div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label class="grid-label" style="color:#8e44ad;">콘크리트 E<sub>p</sub> (kPa)</label>
                <input type="text" id="pile_Ep" value="${formatComma(getVal('Ep', '26700000'))}" class="pl-input comma-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label class="grid-label" style="color:#d4ac0d;">허용 변위 기준 (연직 / 수평상시 / 수평지진시) (mm)</label>
                <div style="display:flex; gap:3px; height:32px;">
                    <input type="text" id="pile_allow_settle" value="${formatComma(getVal('allow_settle', '25.0'), 1)}" placeholder="연직" class="pl-input dec-input" style="width:33.3%; height:100%;">
                    <input type="text" id="pile_allow_h_disp_norm" value="${formatComma(getVal('allow_h_disp_norm', '15.0'), 1)}" placeholder="상시" class="pl-input dec-input" style="width:33.3%; height:100%;">
                    <input type="text" id="pile_allow_h_disp_seis" value="${formatComma(getVal('allow_h_disp_seis', '25.0'), 1)}" placeholder="지진" class="pl-input dec-input" style="width:33.3%; height:100%;">
                </div>
            </div>
        </div>

        <div id="ep_calc_info_box" style="margin-bottom: 10px; font-size: 0.82em; color: #2c3e50; background: #fafafa; padding: 6px 10px; border-radius: 4px; border: 1px solid #e0e0e0; line-height: 1.4;"></div>

        <details style="margin-bottom: 15px; border: 1px solid #d5d8dc; border-radius: 4px; padding: 6px 10px; background: #fafafa;">
            <summary style="font-weight: bold; cursor: pointer; color: #2980b9; font-size: 0.85em;">
                ▼ E<sub>0</sub>와 &alpha; 값 (구조물기초설계기준) <span style="font-weight: normal; font-size: 0.9em; color: #7f8c8d;">► (클릭하여 펼치기/접기)</span>
            </summary>
            <div style="margin-top: 8px;">
                <table class="result-table" style="font-size: 0.82em; text-align: center; width: 100%;">
                    <thead>
                        <tr style="background-color: #eaeded;">
                            <th style="text-align: center;">시험방법에 의한 변형계수 E<sub>0</sub> (kPa)</th>
                            <th style="width: 20%;">&alpha; (평상시)</th>
                            <th style="width: 20%; color: #c0392b;">&alpha; (지진 시)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="text-align: left; padding-left: 10px;">지름 30cm 원판 평판재하시험 반복곡선 변형계수의 1/2</td><td>1</td><td style="color: #c0392b; font-weight: bold;">2</td></tr>
                        <tr><td style="text-align: left; padding-left: 10px;">보링 공내에서 측정한 변형계수</td><td>4</td><td style="color: #c0392b; font-weight: bold;">8</td></tr>
                        <tr><td style="text-align: left; padding-left: 10px;">공시체의 1축 또는 3축 압축시험 변형계수</td><td>4</td><td style="color: #c0392b; font-weight: bold;">8</td></tr>
                        <tr><td style="text-align: left; padding-left: 10px;">표준관입시험 N값 추정 변형계수 (E<sub>0</sub> = 2,800N)</td><td>1</td><td style="color: #c0392b; font-weight: bold;">2</td></tr>
                    </tbody>
                </table>
            </div>
        </details>

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

    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('comma-input')) {
            let rawVal = e.target.value.replace(/,/g, '');
            if (!isNaN(parseFloat(rawVal)) || rawVal === '' || rawVal === '.') {
                e.target.value = formatComma(rawVal);
            }
        }
    });

    container.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const target = e.target;
            if (target.classList.contains('pl-input') || target.classList.contains('pl-select')) {
                const tr = target.closest('tr');
                if (!tr || !tr.parentElement || tr.parentElement.id !== 'pile_layers_body') return;

                e.preventDefault();
                const tbody = tr.parentElement;
                const rows = Array.from(tbody.children);
                const td = target.closest('td');
                const rowIndex = rows.indexOf(tr);
                const colIndex = Array.from(tr.children).indexOf(td);

                const totalRows = rows.length;
                let nextRow = rowIndex + (e.shiftKey ? -1 : 1);
                let nextCol = colIndex;

                if (nextRow < 0) {
                    nextRow = totalRows - 1;
                    nextCol = colIndex - 1;
                } else if (nextRow >= totalRows) {
                    nextRow = 0;
                    nextCol = colIndex + 1;
                }

                const targetRow = rows[nextRow];
                if (targetRow) {
                    let targetTd = targetRow.children[nextCol];
                    if (!targetTd) {
                        nextCol = e.shiftKey ? targetRow.children.length - 2 : 0;
                        targetTd = targetRow.children[nextCol];
                    }
                    if (targetTd) {
                        const elem = targetTd.querySelector('input, select');
                        if (elem) {
                            elem.focus();
                            if (elem.select) elem.select();
                        }
                    }
                }
            }
        }
    });

    function autoCalculateEp() {
        const fckInput = parseNum(container.querySelector('#pile_fck')?.value) || 35.0;
        const concCond = container.querySelector('#pile_conc_cond')?.value || 'underwater';

        let fc_prime = fckInput;
        let condStr = "";
        if (concCond === 'underwater') {
            fc_prime = 0.6 * fckInput + 6.0;
            condStr = `수중타설 f'<sub>c</sub> = 0.6 &times; ${fckInput.toFixed(1)} + 6 = ${fc_prime.toFixed(1)} MPa`;
        } else {
            condStr = `비수중타설 f'<sub>c</sub> = ${fckInput.toFixed(1)} MPa`;
        }

        let fcu = fc_prime + 4.0;
        let Ep_MPa = 8500 * Math.cbrt(fcu);
        let Ep_raw_kPa = Ep_MPa * 1000;
        let Ep_kPa = Math.floor(Ep_raw_kPa / 10000) * 10000;

        const epInput = container.querySelector('#pile_Ep');
        if (epInput) {
            epInput.value = formatComma(Ep_kPa);
            try { localStorage.setItem('geo_cast_pile_Ep', Ep_kPa); } catch(err){}
        }

        const epBox = container.querySelector('#ep_calc_info_box');
        if (epBox) {
            epBox.innerHTML = `
                <strong>※ 콘크리트 탄성계수 (E<sub>p</sub>) 산정공식 및 실시간 계산과정:</strong> E<sub>p</sub> = 8,500 &times; &sup3;&radic;(f<sub>cu</sub>) (MPa) [단, f<sub>cu</sub> = f'<sub>c</sub> + 4, 10,000 kPa 단위 이하 절사]<br>
                &bull; <strong>계산단계:</strong> f<sub>ck</sub> = ${fckInput.toFixed(1)} MPa (${condStr}) &rArr; f<sub>cu</sub> = ${fc_prime.toFixed(1)} + 4 = <strong>${fcu.toFixed(1)} MPa</strong> &rArr; E<sub>p</sub> = 8,500 &times; &sup3;&radic;(${fcu.toFixed(1)}) = ${formatComma(Ep_MPa.toFixed(1), 1)} MPa (${formatComma(Math.round(Ep_raw_kPa))} kPa) &rArr; <strong>${formatComma(Ep_kPa)} kPa</strong>
            `;
        }
    }

    function updateFormulaInfoText() {
        const type = container.querySelector('#pile_type').value;
        const qpVal = container.querySelector('#pile_qp_formula')?.value || 'rock_case2';
        const infoBox = container.querySelector('#formula_info_box');
        const userFck = parseNum(container.querySelector('#pile_fck')?.value) || 35.0;
        const concCond = container.querySelector('#pile_conc_cond')?.value || 'underwater';

        if (!infoBox) return;

        let qpText = "";
        let qsText = "토사~풍화암 : KDS 24 14 51(AASHTO), 암반 : Horvath & Kenney(1979)";

        if (type === 'CAST_ROCK') {
            if (qpVal === 'rock_case1') qpText = "q<sub>p</sub> = 2.5 &times; q<sub>u</sub> (신선암반/닫힌절리)";
            else qpText = "q<sub>p</sub> = [&radic;s + &radic;(m &times; &radic;s + s)] &times; q<sub>u</sub> (여러방향 절리, Hoek-Brown 적용)";
        } else {
            qpText = "57.4 &times; N (N&le;75) / 4,309.2 kN/m² (N>75) [O'Neill & Reese (1999)]";
        }

        let fc_prime = userFck;
        let calcNote = "";
        if (concCond === 'underwater') {
            fc_prime = 0.6 * userFck + 6.0;
            calcNote = `수중타설 적용 (선형보간 식: f'<sub>c</sub> = 0.6 &times; ${userFck.toFixed(1)} + 6 = <strong>${fc_prime.toFixed(1)} MPa</strong>)`;
        } else {
            calcNote = `비수중타설 적용 (설계기준강도 f'<sub>c</sub> = <strong>${userFck.toFixed(1)} MPa</strong>)`;
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 6px;">▶ 적용 산정식 개요</div>
            <div style="margin-left: 4px; line-height: 1.5;">
                • <strong>연직 선단지지력 :</strong> ${qpText}<br>
                • <strong>연직 주면마찰력 :</strong> ${qsText}<br>
                • <strong>침하량 산정 :</strong> ${type === 'CAST_ROCK' ? 'Pells & Turner (1979) 암반소켓 탄성침하 공식 적용' : 'Vesic (1977) 경험적 침하 공식 적용'}<br>
                • <strong>수평 지지력/변위 :</strong> Broms 극한평형법 및 Chang 탄성지반반력법 적용
            </div>

            <div style="margin-top: 8px; font-weight: bold; color: #2c3e50;">[표 4.1-1 수중에서 시공하는 현장타설말뚝의 콘크리트 설계기준강도]</div>
            <table class="result-table" style="font-size: 0.88em; text-align: center; width: 100%; margin-top: 4px; background: white;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>표준양생 공시체의 28일 압축강도 (f<sub>ck</sub>)</th>
                        <th style="${Math.abs(userFck-30)<0.1?'background:#d4efdf;font-weight:bold;':''}">30</th>
                        <th style="${Math.abs(userFck-35)<0.1?'background:#d4efdf;font-weight:bold;':''}">35</th>
                        <th style="${Math.abs(userFck-40)<0.1?'background:#d4efdf;font-weight:bold;':''}">40</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>수중콘크리트의 설계기준강도 (f'<sub>c</sub>)</td>
                        <td style="${Math.abs(userFck-30)<0.1?'background:#d4efdf;font-weight:bold;':''}">24</td>
                        <td style="${Math.abs(userFck-35)<0.1?'background:#d4efdf;font-weight:bold;':''}">27</td>
                        <td style="${Math.abs(userFck-40)<0.1?'background:#d4efdf;font-weight:bold;':''}">30</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top: 4px; font-size: 0.9em; color: #2980b9;">
                &bull; 입력 강도 산정 결과: ${calcNote}
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
                <label class="grid-label">보강철근 제원</label>
                <div style="display:flex; gap:2px; height:32px; align-items:center;">
                    <select id="pile_rebar_d" class="grid-select" style="flex:1.2; padding:2px; font-size:0.85em;">
                        <option value="19.10" ${initialRebarD === '19.10' ? 'selected' : ''}>D19</option>
                        <option value="22.20" ${initialRebarD === '22.20' ? 'selected' : ''}>D22</option>
                        <option value="25.40" ${initialRebarD === '25.40' ? 'selected' : ''}>D25</option>
                        <option value="28.60" ${initialRebarD === '28.60' ? 'selected' : ''}>D29</option>
                        <option value="31.80" ${initialRebarD === '31.80' ? 'selected' : ''}>D32</option>
                        <option value="34.90" ${initialRebarD === '34.90' ? 'selected' : ''}>D35</option>
                        <option value="38.10" ${initialRebarD === '38.10' ? 'selected' : ''}>D38</option>
                    </select>
                    <select id="pile_rebar_fy" class="grid-select" style="flex:1.3; padding:2px; font-size:0.85em;">
                        <option value="400" ${initialRebarFy === '400' ? 'selected' : ''}>SD400</option>
                        <option value="500" ${initialRebarFy === '500' ? 'selected' : ''}>SD500</option>
                    </select>
                    <input type="number" id="pile_rebar_count" value="${initialRebarCount}" class="pl-input" placeholder="개수" style="width:38px; height:100%;">
                    <span style="font-size:0.85em; color:#2c3e50;">개</span>
                </div>
            </div>
        `;

        if (type === 'CAST_ROCK') {
            grid2Label.innerHTML = '암의 유형 / RMR';
            grid2Content.innerHTML = `
                <div style="display:flex; gap:3px; width:100%; height:100%; align-items:center;">
                    <select id="pile_rock_type" class="grid-select" style="flex:2.4; text-align:left; padding-left:2px; padding-right:2px; font-size:0.83em; text-overflow:ellipsis;">
                        <option value="7">A:벽개발달 탄산염암</option>
                        <option value="10">B:석화 이질암</option>
                        <option value="15">C:뚜렷한벽개 사질암</option>
                        <option value="17" selected>D:세립결정 화성암</option>
                        <option value="25">E:조립결정 화성변성</option>
                    </select>
                    <input type="number" id="pile_rmr" value="${getVal('rmr', '30')}" step="1" placeholder="RMR" class="pl-input" style="flex:0.8; min-width:42px; padding:2px;">
                </div>
            `;

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label class="grid-label">선단 하부 2D 암반</label>
                    <select id="pile_qp_formula" class="grid-select">
                        <option value="rock_case2" ${getVal('qp_formula', 'rock_case2') === 'rock_case2' ? 'selected' : ''}>여러방향 절리</option>
                        <option value="rock_case1" ${getVal('qp_formula', 'rock_case2') === 'rock_case1' ? 'selected' : ''}>신선암반/닫힌절리</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label class="grid-label">Joint 상태</label>
                    <select id="pile_joint_state" class="grid-select">
                        <option value="closed" ${getVal('joint_state', 'closed') === 'closed' ? 'selected' : ''}>Closed Joints</option>
                        <option value="open" ${getVal('joint_state', 'closed') === 'open' ? 'selected' : ''}>Open Joints</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label class="grid-label">RQD (%)</label>
                    <input type="text" id="pile_rqd" value="${formatComma(getVal('rqd', '4.0'), 1)}" class="pl-input dec-input" style="height:32px;">
                </div>
                ${rebarBoxHtml}
            `;
        } else {
            grid2Label.textContent = '세부 구분';
            grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label class="grid-label">선단 하부 2D 암반</label>
                    <select id="pile_qp_formula" class="grid-select" disabled>
                        <option value="oneill" selected>O'Neill & Reese (1999)</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0; grid-column: span 2;">
                    <label class="grid-label">시공 조건</label>
                    <div style="height:32px; display:flex; align-items:center; color:#7f8c8d; font-size:0.85em;">현장타설말뚝 (Bored Cast-in-place Pile)</div>
                </div>
                ${rebarBoxHtml}
            `;
        }
        updateFormulaInfoText();
        autoCalculateEp();
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
        } else if (['pile_fck', 'pile_conc_cond'].includes(e.target.id)) {
            autoCalculateEp();
            updateFormulaInfoText();
            try { localStorage.setItem('geo_cast_pile_' + e.target.id, e.target.value); } catch(err){}
        } else if (['pile_qp_formula', 'pile_rmr', 'pile_joint_state', 'pile_rqd', 'pile_rebar_d', 'pile_rebar_fy', 'pile_rebar_count', 'pile_alpha_norm', 'pile_allow_settle', 'pile_allow_h_disp_norm', 'pile_allow_h_disp_seis', 'pile_head_cond', 'pile_beta_soil'].includes(e.target.id)) {
            try {
                localStorage.setItem('geo_cast_pile_' + e.target.id, e.target.value);
                if (e.target.id === 'pile_beta_soil') localStorage.setItem('geo_cast_pile_beta_soil', e.target.value);
                if (e.target.id === 'pile_head_cond') localStorage.setItem('geo_cast_pile_head_cond', e.target.value);
            } catch(err){}
            if (e.target.id.includes('formula')) updateFormulaInfoText();
        } else if (['pile_Ep', 'pile_D', 'pile_P_norm', 'pile_P_seis', 'pile_H_norm', 'pile_H_seis'].includes(e.target.id)) {
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
                        <select data-idx="${idx}" class="pl-type pl-select grid-select" style="font-size:0.85em; width:100%; height:100%; text-align-last:center;">
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

    const HB_TABLE_DATA = [
        { rmr: 0,   m: { 7: 0.007, 10: 0.010, 15: 0.015, 17: 0.017, 25: 0.025 }, s: 1.0e-7, label: "매우 불량한 암반 (0~3)" },
        { rmr: 3,   m: { 7: 0.029, 10: 0.041, 15: 0.061, 17: 0.069, 25: 0.102 }, s: 3.0e-6, label: "불량한 암반 (3~23)" },
        { rmr: 23,  m: { 7: 0.128, 10: 0.183, 15: 0.275, 17: 0.311, 25: 0.458 }, s: 9.0e-5, label: "보통의 암반 (23~44)" },
        { rmr: 44,  m: { 7: 0.575, 10: 0.821, 15: 1.231, 17: 1.395, 25: 2.052 }, s: 0.0029, label: "양호한 암반 (44~65)" },
        { rmr: 65,  m: { 7: 2.400, 10: 3.430, 15: 5.140, 17: 5.820, 25: 8.567 }, s: 0.082,  label: "매우 양호한 암반 (65~85)" },
        { rmr: 85,  m: { 7: 7.000, 10: 10.000, 15: 15.000, 17: 17.000, 25: 25.000 }, s: 1.00,   label: "신선암 시료 (85~100)" }
    ];

    const ROCK_TYPE_NAME_MAP = {
        7: "A : 벽개발달 탄산염암",
        10: "B : 석화 이질암",
        15: "C : 뚜렷한 벽개 사질암",
        17: "D : 세립결정 화성암",
        25: "E : 조립결정 화성,변성암"
    };

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
        if (rmrVal <= 0) return { m: HB_TABLE_DATA[0].m[miVal], s: HB_TABLE_DATA[0].s, r1: 0, r2: 3 };
        if (rmrVal >= 85) return { m: HB_TABLE_DATA[5].m[miVal], s: HB_TABLE_DATA[5].s, r1: 85, r2: 100 };

        const boundaries = [0, 3, 23, 44, 65, 85];
        for (let i = 0; i < HB_TABLE_DATA.length - 1; i++) {
            const r1 = boundaries[i], r2 = boundaries[i + 1];
            if (rmrVal >= r1 && rmrVal <= r2) {
                const row1 = HB_TABLE_DATA[i], row2 = HB_TABLE_DATA[i + 1];
                const t = (rmrVal - r1) / (r2 - r1);
                const logS1 = Math.log10(row1.s);
                const logS2 = Math.log10(row2.s);
                return {
                    m: row1.m[miVal] + t * (row2.m[miVal] - row1.m[miVal]),
                    s: Math.pow(10, logS1 + t * (logS2 - logS1)),
                    r1: r1, r2: r2
                };
            }
        }
        return { m: HB_TABLE_DATA[2].m[miVal], s: HB_TABLE_DATA[2].s, r1: 23, r2: 44 };
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
            [0.55, 1.15, 1.30, 1.35, 1.38, 1.45],
            [0.55, 0.65, 0.68, 0.70, 0.71, 0.73],
            [0.53, 0.53, 0.53, 0.53, 0.53, 0.53],
            [0.53, 0.42, 0.38, 0.36, 0.35, 0.33],
            [0.53, 0.30, 0.25, 0.21, 0.19, 0.17],
            [0.53, 0.27, 0.21, 0.17, 0.15, 0.13],
            [0.53, 0.24, 0.18, 0.14, 0.12, 0.09]
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
        let v1 = v10 + tx * (v11 - v10);
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

    function calcPhiAvgDetails(targetDepth, layers) {
        let cumDepth = 0;
        let sumPhi = 0, sumCovered = 0;
        let rows = [];
        for (let l of layers) {
            let dz = parseFloat(l.dz) || 0;
            let phi = parseFloat(l.phi) || 0;
            let lTop = cumDepth;
            let lBot = cumDepth + dz;
            if (lTop >= targetDepth) break;
            let coverStart = lTop;
            let coverEnd = Math.min(lBot, targetDepth);
            let coverLen = coverEnd - coverStart;
            if (coverLen > 0) {
                let phi_dz = phi * coverLen;
                sumPhi += phi_dz;
                sumCovered += coverLen;
                rows.push({
                    name: l.name,
                    dz: coverLen,
                    phi: phi,
                    phi_dz: phi_dz
                });
            }
            cumDepth += dz;
        }
        let avgPhi = sumCovered > 0 ? sumPhi / sumCovered : (parseFloat(layers[0]?.phi) || 0);
        return { avgPhi, sumCovered, sumPhi, rows };
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
        let kh_norm_source = kh_road_norm <= kh_fukuoka ? '구조물기초설계기준(2018)' : '후쿠오카 공식';

        let applied_kh_seis = Math.min(kh_road_seis, kh_fukuoka);
        let applied_beta_seis = Math.pow((applied_kh_seis * D) / (4.0 * EI), 0.25);
        let kh_seis_source = kh_road_seis <= kh_fukuoka ? '구조물기초설계기준(2018)' : '후쿠오카 공식';

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
                alert("⚠️ 지지층이 '기반암'으로 선택되었습니다.\n최하단 지층의 토성 구분을 '기반암(연/경암)'으로 설정해 주세요.");
                return;
            }
        }

        const qp_formula_key = container.querySelector('#pile_qp_formula')?.value || 'rock_case2';

        const D_mm = parseNum(container.querySelector('#pile_D').value) || 3000;
        const D = D_mm / 1000.0;
        const gwt = parseFloat(container.querySelector('#pile_gwt')?.value) || 3.1;
        const allow_settle = parseNum(container.querySelector('#pile_allow_settle')?.value) || 25.0;
        
        const allow_h_disp_norm = parseNum(container.querySelector('#pile_allow_h_disp_norm')?.value) || 15.0;
        const allow_h_disp_seis = parseNum(container.querySelector('#pile_allow_h_disp_seis')?.value) || 25.0;
        
        const head_cond = container.querySelector('#pile_head_cond')?.value || 'free';
        const beta_soil = container.querySelector('#pile_beta_soil')?.value || 'sand';
        const alpha_norm_val = parseNum(container.querySelector('#pile_alpha_norm')?.value) || 1.0;

        const user_fck = parseNum(container.querySelector('#pile_fck')?.value) || 35.0;
        const conc_cond = container.querySelector('#pile_conc_cond')?.value || 'underwater';
        const user_rebar_d_mm = parseNum(container.querySelector('#pile_rebar_d')?.value) || 38.10;
        const user_rebar_fy_MPa = parseNum(container.querySelector('#pile_rebar_fy')?.value) || 400;
        const user_rebar_count = parseNum(container.querySelector('#pile_rebar_count')?.value) || 0;

        let fck_eff = user_fck;
        let conc_str_detail = "";
        if (conc_cond === 'underwater') {
            fck_eff = 0.6 * user_fck + 6.0;
            conc_str_detail = `수중 콘크리트 적용 (선형보간 식: f'c = 0.6 &times; ${user_fck.toFixed(1)} + 6 = ${fck_eff.toFixed(1)} MPa)`;
        } else {
            conc_str_detail = `비수중 콘크리트 적용 (설계기준강도 ${user_fck.toFixed(1)} MPa)`;
        }

        let em_ei_val = 0.01, alpha_e_val = 0.370;
        let user_rqd = 4.0;
        let user_joint_state = 'closed';
        if (p_type === 'CAST_ROCK') {
            user_joint_state = container.querySelector('#pile_joint_state')?.value || 'closed';
            user_rqd = parseNum(container.querySelector('#pile_rqd')?.value) || 4.0;
            em_ei_val = interpolateEmEi(user_rqd, user_joint_state);
            alpha_e_val = interpolateAlphaE(em_ei_val);
        }

        const L = calcTotalL();
        const P_norm = parseNum(container.querySelector('#pile_P_norm').value) || 0;
        const P_seis = parseNum(container.querySelector('#pile_P_seis').value) || 0;
        const H_norm = parseNum(container.querySelector('#pile_H_norm').value) || 0;
        const H_seis = parseNum(container.querySelector('#pile_H_seis').value) || 0;
        const user_Ep = parseNum(container.querySelector('#pile_Ep')?.value) || 26700000;

        let lastLayer = pileLayers[pileLayers.length - 1] || { name: '지반', n_val: 50, qu_val: 30000 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let qu_tip = parseFloat(lastLayer.qu_val) || 0;
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 
        let qp_formula_name = "";
        let qp_calc_detail = "";
        let hbRes = null, hb_m = 0, hb_s = 0, hb_mi = 17, input_rmr = 30;

        if (p_type === 'CAST_ROCK') {
            if (qp_formula_key === 'rock_case1') {
                qp_formula_name = "현장타설말뚝(기반암) - 신선암반/닫힌절리 (2.5 q_u)";
                q_p = 2.5 * qu_tip;
                qp_calc_detail = `• 산정식: q<sub>p</sub> = 2.5 &times; q<sub>u</sub><br>• 계산과정: 2.5 &times; ${formatComma(qu_tip, 1)}<br>• 계산결과: q<sub>p</sub> = <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
            } else {
                qp_formula_name = "현장타설말뚝(기반암) - 여러방향 절리 (Hoek & Brown 적용)";
                hb_mi = parseInt(container.querySelector('#pile_rock_type')?.value) || 17;
                input_rmr = parseNum(container.querySelector('#pile_rmr')?.value) || 30;
                hbRes = interpolateHoekBrown(input_rmr, hb_mi);
                hb_m = hbRes.m; hb_s = hbRes.s;
                let factor = Math.sqrt(hb_s) + Math.sqrt(hb_m * Math.sqrt(hb_s) + hb_s);
                q_p = factor * qu_tip;

                qp_calc_detail = `• 입력 파라미터 : RMR = ${input_rmr}, 암의 유형 = ${ROCK_TYPE_NAME_MAP[hb_mi]}<br>` +
                                 `• 1차 보간 결과 : m = <strong>${hb_m.toFixed(5)}</strong>, s = <strong>${hb_s.toExponential(4)}</strong> (RMR ${hbRes.r1} ~ ${hbRes.r2} 구간 Log보간)<br>` +
                                 `• <i>q<sub>p</sub></i> 산정 공식 : [&radic;s + &radic;(m&radic;s + s)] &times; <i>q<sub>u</sub></i><br>` +
                                 `&nbsp;&nbsp;= [&radic;${hb_s.toExponential(3)} + &radic;(${hb_m.toFixed(4)}&times;&radic;${hb_s.toExponential(3)} + ${hb_s.toExponential(3)})] &times; ${formatComma(qu_tip, 1)}<br>` +
                                 `&nbsp;&nbsp;= ${factor.toFixed(4)} &times; ${formatComma(qu_tip, 1)}<br>` +
                                 `&nbsp;&nbsp;= <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
            }
        } else {
            qp_formula_name = "현장타설말뚝 - O'Neill & Reese (1999)";
            q_p = raw_N_tip <= 75 ? 57.4 * raw_N_tip : 4309.2;
            qp_calc_detail = `• 산정식: q<sub>p</sub> = ${raw_N_tip <= 75 ? "57.4 &times; N" : "4309.2 (N>75 상한)"}<br>• 계산과정: ${raw_N_tip <= 75 ? `57.4 &times; ${raw_N_tip}` : "4309.2"}<br>• 계산결과: q<sub>p</sub> = <strong>${formatComma(q_p, 1)} kN/m²</strong>`;
        }

        const Qup = q_p * Ap;

        const As = Math.PI * D;
        let total_Qus = 0;
        let layer_calc_rows = [];
        let qs_formula_name = "토사~풍화암 : KDS 24 14 51(AASHTO), 암반 : Horvath & Kenney(1979)";

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

            let total_str = cum_sigma_v > 0 
                ? `${cum_sigma_v.toFixed(1)} + (${gamma_i.toFixed(1)}&times;${(0.5*dz_i).toFixed(2)}) = ${sigma_v_mid.toFixed(1)}` 
                : `${gamma_i.toFixed(1)}&times;${(0.5*dz_i).toFixed(2)} = ${sigma_v_mid.toFixed(1)}`;
            let u_str = z_mid > gwt 
                ? `(${z_mid.toFixed(2)} - ${gwt.toFixed(1)})&times;9.81 = ${u_mid.toFixed(1)}` 
                : `0.0`;

            if (l.type === 'rock' && p_type === 'CAST_ROCK') {
                let P_a = 0.101; 
                let qu_MPa = qu_val_i / 1000.0; 
                let fs_MPa = 0.65 * alpha_e_val * P_a * Math.pow(qu_MPa / P_a, 0.5); 
                let fs_limit_MPa = 7.8 * P_a * Math.pow(fck_eff / P_a, 0.5); 
                let f_unit_MPa = Math.min(fs_MPa, fs_limit_MPa);
                f_unit = f_unit_MPa * 1000.0; 
                formula_str = `&bull; min(0.65&middot;<i>&alpha;<sub>E</sub></i>&middot;<i>P<sub>a</sub></i>&middot;(<i>q<sub>u</sub></i>/<i>P<sub>a</sub></i>)<sup>0.5</sup>, &nbsp; 7.8&middot;<i>P<sub>a</sub></i>&middot;(<i>f'<sub>c</sub></i>/<i>P<sub>a</sub></i>)<sup>0.5</sup>)<br>` +
                              `= min(0.65&times;${alpha_e_val.toFixed(3)}&times;${P_a}&times;(${qu_MPa.toFixed(2)}/${P_a})<sup>0.5</sup>, &nbsp; 7.8&times;${P_a}&times;(${fck_eff.toFixed(1)}/${P_a})<sup>0.5</sup>)<br>` +
                              `= min(${(fs_MPa*1000).toFixed(1)}, ${(fs_limit_MPa*1000).toFixed(1)}) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
            } else {
                if (l.type === 'sand' || l.type === 'weathered_rock') {
                    let z_mm = z_mid * 1000.0;
                    let beta_calc = 1.5 - (7.7e-3 * Math.sqrt(z_mm));
                    let beta = N_60 >= 15 ? beta_calc : (N_60 / 15.0) * beta_calc;
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);
                    
                    let condStr = N_60 >= 15 ? `N<sub>60</sub> &ge; 15` : `N<sub>60</sub> &lt; 15`;
                    let formulaBase = N_60 >= 15 ? `1.5 - (7.7&times;10<sup>-3</sup>&radic;z)` : `(N<sub>60</sub> / 15) &times; [1.5 - (7.7&times;10<sup>-3</sup>&radic;z)]`;

                    formula_str = `&bull; 전응력 &sigma;<sub>v</sub> = ${total_str} kPa<br>` +
                                  `&bull; 간극수압 u = ${u_str} kPa<br>` +
                                  `&bull; 유효응력 &sigma;'<sub>v</sub> = ${sigma_v_mid.toFixed(1)} - ${u_mid.toFixed(1)} = <strong>${sigma_v_prime.toFixed(1)} kPa</strong><br>` +
                                  `&bull; <i>&beta;</i> = ${formulaBase} (${condStr}) &rarr; <i>&beta;</i> = ${beta_clamped.toFixed(3)}<br>` +
                                  `&bull; q<sub>s</sub> = min(190 kPa, <i>&beta;</i>&middot;<i>&sigma;'<sub>v</sub></i>) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else if (l.type === 'gravel') {
                    let z_mm = z_mid * 1000.0;
                    let beta = 2.0 - 0.00082 * Math.pow(z_mm, 0.75);
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);

                    formula_str = `&bull; 전응력 &sigma;<sub>v</sub> = ${total_str} kPa<br>` +
                                  `&bull; 간극수압 u = ${u_str} kPa<br>` +
                                  `&bull; 유효응력 &sigma;'<sub>v</sub> = ${sigma_v_mid.toFixed(1)} - ${u_mid.toFixed(1)} = <strong>${sigma_v_prime.toFixed(1)} kPa</strong><br>` +
                                  `&bull; <i>&beta;</i> = 2.0 - 0.00082(z)<sup>0.75</sup> &rarr; <i>&beta;</i> = ${beta_clamped.toFixed(3)}<br>` +
                                  `&bull; q<sub>s</sub> = min(190 kPa, <i>&beta;</i>&middot;<i>&sigma;'<sub>v</sub></i>) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else {
                    let Su = c_val_i;
                    let Pa = 101.0;
                    let ratio_su_pa = Su / Pa;
                    let alpha_clay = 0.55;

                    if (ratio_su_pa <= 1.5) {
                        alpha_clay = 0.55;
                    } else if (ratio_su_pa <= 2.5) {
                        alpha_clay = 0.55 - 0.1 * (ratio_su_pa - 1.5);
                    } else {
                        alpha_clay = 0.45;
                    }

                    let calc_val = alpha_clay * Su;
                    f_unit = Math.min(190.0, calc_val);

                    let alpha_formula_str = ratio_su_pa <= 1.5 
                        ? `0.55 (S<sub>u</sub>/P<sub>a</sub> &le; 1.5)` 
                        : `0.55 - 0.1(S<sub>u</sub>/P<sub>a</sub> - 1.5) = ${alpha_clay.toFixed(3)}`;

                    formula_str = `&bull; 전응력 &sigma;<sub>v</sub> = ${total_str} kPa, 간극수압 u = ${u_str} kPa<br>` +
                                  `&bull; 유효응력 &sigma;'<sub>v</sub> = ${sigma_v_mid.toFixed(1)} - ${u_mid.toFixed(1)} = ${sigma_v_prime.toFixed(1)} kPa<br>` +
                                  `&bull; S<sub>u</sub> = ${Su.toFixed(1)} kPa, S<sub>u</sub>/P<sub>a</sub> = ${ratio_su_pa.toFixed(2)} (P<sub>a</sub> = 101 kPa)<br>` +
                                  `&bull; 부착력계수 &alpha; = ${alpha_formula_str}<br>` +
                                  `&bull; q<sub>s</sub> = min(190, &alpha;&middot;S<sub>u</sub>) = <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
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

        let extraRockTablesHtml = "";
        if (p_type === 'CAST_ROCK' && qp_formula_key === 'rock_case2') {
            const svgW = 290, svgH = 250;
            const padL_m = 45, padR_m = 15, padT_m = 25, padB_m = 45;
            const plotW_m = svgW - padL_m - padR_m, plotH_m = svgH - padT_m - padB_m;

            const getPxRMR_m = (rmr) => padL_m + (Math.max(0, Math.min(100, rmr)) / 100.0) * plotW_m;
            const getPyM = (mVal) => padT_m + plotH_m - (Math.max(0, Math.min(25, mVal)) / 25.0) * plotH_m;

            const gridRMR_m = [0, 20, 40, 60, 80, 100];
            let xGridM = gridRMR_m.map(r => `
                <line x1="${getPxRMR_m(r)}" y1="${padT_m}" x2="${getPxRMR_m(r)}" y2="${padT_m+plotH_m}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>
                <text x="${getPxRMR_m(r)}" y="${padT_m+plotH_m+15}" font-size="10" text-anchor="middle" fill="#555">${r}</text>
            `).join('');

            const gridM = [0, 5, 10, 15, 20, 25];
            let yGridM = gridM.map(m => `
                <line x1="${padL_m}" y1="${getPyM(m)}" x2="${padL_m+plotW_m}" y2="${getPyM(m)}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>
                <text x="${padL_m-5}" y="${getPyM(m)+4}" font-size="10" text-anchor="end" fill="#555">${m}</text>
            `).join('');

            const rockTypesArr = [
                { key: 7, label: "A:탄산염암", color: "#2980b9" },
                { key: 10, label: "B:이질암", color: "#27ae60" },
                { key: 15, label: "C:사질암", color: "#d35400" },
                { key: 17, label: "D:화성암", color: "#8e44ad" },
                { key: 25, label: "E:변성암", color: "#c0392b" }
            ];

            let hbPathsM = rockTypesArr.map(rt => {
                let pts = [];
                for (let r = 0; r <= 100; r += 1) {
                    let res = interpolateHoekBrown(r, rt.key);
                    pts.push([r, res.m]);
                }
                let dStr = pts.map((p, i) => `${i===0?'M':'L'} ${getPxRMR_m(p[0])} ${getPyM(p[1])}`).join(' ');
                let isSel = (rt.key === hb_mi);
                let strokeW = isSel ? "2.5" : "1.0";
                let opacity = isSel ? "1.0" : "0.35";
                return `<path d="${dStr}" fill="none" stroke="${rt.color}" stroke-width="${strokeW}" stroke-opacity="${opacity}"/>`;
            }).join('');

            const ptHBX_m = getPxRMR_m(input_rmr), ptHBY_m = getPyM(hb_m);

            const padL_s = 52, padR_s = 15, padT_s = 25, padB_s = 45;
            const plotW_s = svgW - padL_s - padR_s, plotH_s = svgH - padT_s - padB_s;

            const getPxRMR_s = (rmr) => padL_s + (Math.max(0, Math.min(100, rmr)) / 100.0) * plotW_s;
            const getPyS = (sVal) => {
                let logVal = Math.log10(Math.max(1.0e-7, sVal));
                return padT_s + plotH_s - ((logVal - (-7.0)) / 7.0) * plotH_s;
            };

            let xGridS = gridRMR_m.map(r => `
                <line x1="${getPxRMR_s(r)}" y1="${padT_s}" x2="${getPxRMR_s(r)}" y2="${padT_s+plotH_s}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>
                <text x="${getPxRMR_s(r)}" y="${padT_s+plotH_s+15}" font-size="10" text-anchor="middle" fill="#555">${r}</text>
            `).join('');

            const gridS_ticks = [
                { val: 1.0e-7, lbl: "1e-7" },
                { val: 1.0e-5, lbl: "1e-5" },
                { val: 1.0e-3, lbl: "1e-3" },
                { val: 0.082,  lbl: "0.08" },
                { val: 1.0,    lbl: "1.0" }
            ];

            let yGridS = gridS_ticks.map(st => `
                <line x1="${padL_s}" y1="${getPyS(st.val)}" x2="${padL_s+plotW_s}" y2="${getPyS(st.val)}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>
                <text x="${padL_s-5}" y="${getPyS(st.val)+4}" font-size="9" text-anchor="end" fill="#555">${st.lbl}</text>
            `).join('');

            let sPoints = [];
            for (let r = 0; r <= 100; r += 1) {
                let res = interpolateHoekBrown(r, hb_mi);
                sPoints.push([r, res.s]);
            }
            let dStrS = sPoints.map((p, i) => `${i===0?'M':'L'} ${getPxRMR_s(p[0])} ${getPyS(p[1])}`).join(' ');

            const ptHBX_s = getPxRMR_s(input_rmr), ptHBY_s = getPyS(hb_s);

            extraRockTablesHtml = `
                <div style="margin-top: 15px; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #d5d8dc;">
                    <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ 표 1. 비선형 강도 정의상 암질과 재료상수의 대략적인 관계 (Hoek & Brown, 1988)</div>
                    <div class="table-container" style="margin-bottom: 12px;">
                        <table class="result-table" style="font-size: 0.8em; text-align: center;">
                            <thead>
                                <tr style="background-color: #eaeded;">
                                    <th rowspan="2">암 질</th><th rowspan="2">정수</th>
                                    <th colspan="5">암의 유형 (<i>m<sub>i</sub></i>)</th>
                                </tr>
                                <tr style="background-color: #f2f4f4;">
                                    <th style="${hb_mi===7?'background:#d4efdf;font-weight:bold;':''}">A: 탄산염암</th>
                                    <th style="${hb_mi===10?'background:#d4efdf;font-weight:bold;':''}">B: 이질암</th>
                                    <th style="${hb_mi===15?'background:#d4efdf;font-weight:bold;':''}">C: 사질암</th>
                                    <th style="${hb_mi===17?'background:#d4efdf;font-weight:bold;':''}">D: 화성암</th>
                                    <th style="${hb_mi===25?'background:#d4efdf;font-weight:bold;':''}">E: 변성암</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${HB_TABLE_DATA.map(row => {
                                    const isTargetRow = (hbRes && (row.rmr === hbRes.r1 || row.rmr === hbRes.r2));
                                    const rowStyle = isTargetRow ? 'background-color:#fef9e7; font-weight:bold;' : '';
                                    return `
                                        <tr style="${rowStyle}">
                                            <td>${row.label}</td>
                                            <td>m<br>s</td>
                                            <td>${row.m[7].toFixed(3)}<br>${row.s.toExponential(1)}</td>
                                            <td>${row.m[10].toFixed(3)}<br>${row.s.toExponential(1)}</td>
                                            <td>${row.m[15].toFixed(3)}<br>${row.s.toExponential(1)}</td>
                                            <td>${row.m[17].toFixed(3)}<br>${row.s.toExponential(1)}</td>
                                            <td>${row.m[25].toFixed(3)}<br>${row.s.toExponential(1)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="font-weight: bold; margin-top: 10px; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ Hoek & Brown 재료상수 (m, s) 보간 산출 그래프</div>
                    
                    <div style="display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; font-size: 0.78em; background: #f8f9f9; padding: 5px 8px; border-radius: 4px; border: 1px solid #ebedef;">
                        <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:12px; height:2px; background:#2980b9; display:inline-block;"></span> A:탄산염암</span>
                        <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:12px; height:2px; background:#27ae60; display:inline-block;"></span> B:이질암</span>
                        <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:12px; height:2px; background:#d35400; display:inline-block;"></span> C:사질암</span>
                        <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:12px; height:2px; background:#8e44ad; display:inline-block;"></span> D:화성암</span>
                        <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:12px; height:2px; background:#c0392b; display:inline-block;"></span> E:변성암</span>
                        <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:12px; height:2px; background:#8e44ad; stroke-dasharray:2,2; display:inline-block;"></span> s 보간곡선</span>
                        <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:8px; height:8px; border-radius:50%; background:#e74c3c; display:inline-block;"></span> 보간 산출지점</span>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: space-between; align-items: center; margin: 10px 0;">
                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 0.8em; font-weight: bold; color: #2980b9; margin-bottom: 3px;">(a) RMR - m 상관 그래프</div>
                            <svg width="${svgW}" height="${svgH}" style="background:white; border:1px solid #bdc3c7; border-radius:4px;">
                                ${xGridM} ${yGridM} ${hbPathsM}
                                <rect x="${padL_m}" y="${padT_m}" width="${plotW_m}" height="${plotH_m}" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
                                <text x="14" y="${padT_m + plotH_m/2}" transform="rotate(-90 14,${padT_m + plotH_m/2})" font-size="11" font-weight="bold" fill="#2c3e50" text-anchor="middle">m 값</text>
                                <text x="${padL_m + plotW_m/2}" y="${svgH - 8}" font-size="11" font-weight="bold" fill="#2c3e50" text-anchor="middle">RMR</text>
                                <circle cx="${ptHBX_m}" cy="${ptHBY_m}" r="5" fill="#e74c3c" stroke="white" stroke-width="1.5"/>
                                <rect x="${ptHBX_m + 5}" y="${ptHBY_m - 18}" width="65" height="15" fill="#ffffff" fill-opacity="0.9" rx="3" stroke="#e74c3c" stroke-width="0.8"/>
                                <text x="${ptHBX_m + 8}" y="${ptHBY_m - 7}" font-size="10" font-weight="bold" fill="#e74c3c">m = ${hb_m.toFixed(3)}</text>
                            </svg>
                        </div>

                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 0.8em; font-weight: bold; color: #8e44ad; margin-bottom: 3px;">(b) RMR - s 상관 그래프 (Log)</div>
                            <svg width="${svgW}" height="${svgH}" style="background:white; border:1px solid #bdc3c7; border-radius:4px;">
                                ${xGridS} ${yGridS}
                                <path d="${dStrS}" fill="none" stroke="#8e44ad" stroke-width="2.5"/>
                                <rect x="${padL_s}" y="${padT_s}" width="${plotW_s}" height="${plotH_s}" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
                                <text x="14" y="${padT_s + plotH_s/2}" transform="rotate(-90 14,${padT_s + plotH_s/2})" font-size="11" font-weight="bold" fill="#2c3e50" text-anchor="middle">s 값</text>
                                <text x="${padL_s + plotW_s/2}" y="${svgH - 8}" font-size="11" font-weight="bold" fill="#2c3e50" text-anchor="middle">RMR</text>
                                <circle cx="${ptHBX_s}" cy="${ptHBY_s}" r="5" fill="#e74c3c" stroke="white" stroke-width="1.5"/>
                                <rect x="${ptHBX_s + 5}" y="${ptHBY_s - 18}" width="78" height="15" fill="#ffffff" fill-opacity="0.9" rx="3" stroke="#e74c3c" stroke-width="0.8"/>
                                <text x="${ptHBX_s + 8}" y="${ptHBY_s - 7}" font-size="10" font-weight="bold" fill="#e74c3c">s = ${hb_s.toExponential(2)}</text>
                            </svg>
                        </div>
                    </div>
                </div>
            `;
        }

        let extraRockQsTablesHtml = "";
        if (p_type === 'CAST_ROCK') {
            const svgW = 600, svgH = 310;
            const padLeft = 70, padRight = 20, padTop = 20, padBottom = 50;
            const plotW = svgW - padLeft - padRight, plotH = svgH - padTop - padBottom;

            const getPxRQD = (rqd) => padLeft + (Math.max(0, Math.min(100, rqd)) / 100.0) * plotW;
            const getPyRatio = (r) => padTop + plotH - (Math.max(0, Math.min(1.0, r)) / 1.0) * plotH;

            const gridRQD = [0, 20, 40, 60, 80, 100];
            let xGridRQD = gridRQD.map(rqd => `
                <line x1="${getPxRQD(rqd)}" y1="${padTop}" x2="${getPxRQD(rqd)}" y2="${padTop+plotH}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>
                <text x="${getPxRQD(rqd)}" y="${padTop+plotH+16}" font-size="11" text-anchor="middle" fill="#555">${rqd}</text>
            `).join('');

            const gridRatio = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
            let yGridRatio = gridRatio.map(r => `
                <line x1="${padLeft}" y1="${getPyRatio(r)}" x2="${padLeft+plotW}" y2="${getPyRatio(r)}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>
                <text x="${padLeft-10}" y="${getPyRatio(r)+4}" font-size="11" text-anchor="end" fill="#555">${r.toFixed(2)}</text>
            `).join('');

            let pathClosed = TABLE_EM_EI.map((p, i) => `${i===0?'M':'L'} ${getPxRQD(p.rqd)} ${getPyRatio(p.closed)}`).join(' ');
            let pathOpen = TABLE_EM_EI.map((p, i) => `${i===0?'M':'L'} ${getPxRQD(p.rqd)} ${getPyRatio(p.open)}`).join(' ');

            const ptRQD_X = getPxRQD(user_rqd), ptRQD_Y = getPyRatio(em_ei_val);

            let labelY = em_ei_val < 0.25 ? ptRQD_Y - 10 : ptRQD_Y + 18;
            let labelX = ptRQD_X + 10;
            if (user_rqd > 80) labelX = ptRQD_X - 55;

            extraRockQsTablesHtml = `
                <div style="margin-top: 15px; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #d5d8dc;">
                    <div style="display: flex; gap: 10px; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.83em;">■ 표 3. RQD에 따른 <i>E<sub>m</sub></i> / <i>E<sub>i</sub></i> (O'Neill & Reese, 1999)</div>
                            <div class="table-container" style="margin: 0;">
                                <table class="result-table" style="font-size: 0.8em; text-align: center; width: 100%;">
                                    <thead>
                                        <tr style="background-color: #eaeded;">
                                            <th>RQD (%)</th>
                                            <th>Closed Joints</th>
                                            <th>Open Joints</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${TABLE_EM_EI.map(row => `
                                            <tr>
                                                <td>${row.rqd}</td>
                                                <td style="${user_joint_state==='closed'&&Math.abs(user_rqd-row.rqd)<5?'background:#fef9e7;font-weight:bold;':''}">${row.closed.toFixed(2)}</td>
                                                <td style="${user_joint_state==='open'&&Math.abs(user_rqd-row.rqd)<5?'background:#fef9e7;font-weight:bold;':''}">${row.open.toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style="flex: 1;">
                            <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.83em;">■ 표 4. 감소계수 <i>&alpha;<sub>E</sub></i> (O'Neill & Reese, 1999)</div>
                            <div class="table-container" style="margin: 0;">
                                <table class="result-table" style="font-size: 0.8em; text-align: center; width: 100%;">
                                    <thead>
                                        <tr style="background-color: #eaeded;">
                                            <th><i>E<sub>m</sub></i> / <i>E<sub>i</sub></i></th>
                                            <th>감소계수 <i>&alpha;<sub>E</sub></i></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${TABLE_ALPHA_E.map(row => `
                                            <tr>
                                                <td>${row.ratio.toFixed(3)}</td>
                                                <td>${row.alpha.toFixed(3)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div style="font-size: 0.82em; color: #2c3e50; margin-bottom: 10px; background:#e8f8f5; padding:6px; border-radius:3px;">
                        • 입력 RQD = <strong>${user_rqd}%</strong> (${user_joint_state === 'closed' ? 'Closed Joints' : 'Open Joints'}) &rarr; 산정 <strong><i>E<sub>m</sub></i> / <i>E<sub>i</sub></i> = ${em_ei_val.toFixed(3)}</strong>, <strong>감소계수 <i>&alpha;<sub>E</sub></i> = ${alpha_e_val.toFixed(3)}</strong>
                    </div>

                    <div style="font-weight: bold; margin-top: 10px; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ RQD에 따른 <i>E<sub>m</sub></i> / <i>E<sub>i</sub></i> 상관 그래프</div>
                    
                    <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 8px; font-size: 0.8em; background: #f8f9f9; padding: 5px 8px; border-radius: 4px; border: 1px solid #ebedef;">
                        <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:14px; height:3px; background:#1b4f72; display:inline-block;"></span> Closed Joints (닫힌 절리)</span>
                        <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:14px; height:3px; background:#27ae60; display:inline-block;"></span> Open Joints (열린 절리)</span>
                        <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:9px; height:9px; border-radius:50%; background:#e74c3c; display:inline-block;"></span> 보간 산출지점 (${em_ei_val.toFixed(3)})</span>
                    </div>

                    <div style="text-align:center; margin: 10px 0;">
                        <svg width="${svgW}" height="${svgH}" style="background:white; border:1px solid #bdc3c7; border-radius:4px;">
                            ${xGridRQD} ${yGridRatio}
                            <path d="${pathClosed}" fill="none" stroke="#1b4f72" stroke-width="2.5"/>
                            <path d="${pathOpen}" fill="none" stroke="#27ae60" stroke-width="2.5"/>
                            <rect x="${padLeft}" y="${padTop}" width="${plotW}" height="${plotH}" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
                            
                            <text x="18" y="${padTop + plotH/2}" transform="rotate(-90 18,${padTop + plotH/2})" font-size="12" font-weight="bold" fill="#2c3e50" text-anchor="middle">Em / Ei</text>
                            <text x="${padLeft + plotW/2}" y="${padTop + plotH + 36}" font-size="12" font-weight="bold" fill="#2c3e50" text-anchor="middle">RQD (%)</text>
                            
                            <circle cx="${ptRQD_X}" cy="${ptRQD_Y}" r="6" fill="#e74c3c" stroke="white" stroke-width="2"/>
                            
                            <rect x="${labelX - 4}" y="${labelY - 11}" width="46" height="15" fill="#ffffff" fill-opacity="0.9" rx="3" stroke="#e74c3c" stroke-width="0.8"/>
                            <text x="${labelX}" y="${labelY}" font-size="11" font-weight="bold" fill="#e74c3c">${em_ei_val.toFixed(3)}</text>
                        </svg>
                    </div>
                </div>
            `;
        }

        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        const Ac_gross = Ap; 
        const db_m = user_rebar_d_mm / 1000.0;
        const Ab_single = (Math.PI * Math.pow(db_m, 2)) / 4.0; 
        const Ast = user_rebar_count * Ab_single; 
        const Ac_net = Math.max(0, Ac_gross - Ast); 
        const fca_kNm2 = Math.min(0.25 * fck_eff, 8.5) * 1000.0; 
        
        const fsa_rebar_MPa = 0.40 * user_rebar_fy_MPa;
        const fsa_rebar_kNm2 = fsa_rebar_MPa * 1000.0; 
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
            &nbsp;&nbsp;- 말뚝 단면적 (A) = ${frac("&pi; &times; D²", "4")} = <strong>${Ac_gross.toFixed(4)} m²</strong><br>
            &nbsp;&nbsp;- 보강철근 단면적 (A<sub>st</sub>) = n &times; A<sub>b</sub> = <strong>${Ast.toFixed(6)} m²</strong> (D${Math.round(user_rebar_d_mm)} &times; ${user_rebar_count}개)<br>
            &nbsp;&nbsp;- 콘크리트 순단면적 (A<sub>c</sub>) = A - A<sub>st</sub> = <strong>${Ac_net.toFixed(4)} m²</strong><br>
            &nbsp;&nbsp;- 콘크리트 허용압축강도 (f<sub>ca</sub>) = min(0.25 &times; ${fck_eff.toFixed(1)}, 8.5 MPa) = <strong>${(fca_kNm2 / 1000.0).toFixed(2)} MPa</strong> (${formatComma(fca_kNm2)} kN/m²)<br>
            &nbsp;&nbsp;- 철근 항복강도 (f<sub>y</sub>) = <strong>${user_rebar_fy_MPa} MPa</strong> (SD${user_rebar_fy_MPa})<br>
            &nbsp;&nbsp;- 철근 허용압축강도 (f<sub>sa</sub>) = 0.40 &times; f<sub>y</sub> = 0.40 &times; ${user_rebar_fy_MPa} = <strong>${fsa_rebar_MPa.toFixed(1)} MPa</strong> (${formatComma(fsa_rebar_kNm2)} kN/m²)<br>
            &nbsp;&nbsp;- 총 기본 허용압축하중 (Q<sub>mat_base</sub>) = f<sub>ca</sub>&middot;A<sub>c</sub> + f<sub>sa</sub>&middot;A<sub>st</sub><br>
            &nbsp;&nbsp;&nbsp;&nbsp;= (${formatComma(fca_kNm2)} &times; ${Ac_net.toFixed(4)}) + (${formatComma(fsa_rebar_kNm2)} &times; ${Ast.toFixed(6)}) = <strong>${formatComma(Q_mat_base, 1)} kN</strong>
        `;

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

        let phiInfoNorm = calcPhiAvgDetails(1.0 / beta_norm, pileLayers);
        let phiInfoSeis = calcPhiAvgDetails(1.0 / beta_seis, pileLayers);

        let phi_rad_norm = (phiInfoNorm.avgPhi * Math.PI) / 180.0;
        let Kp_norm = (1.0 + Math.sin(phi_rad_norm)) / (1.0 - Math.sin(phi_rad_norm));
        let gamma_sub_norm = topLayer.gamma ? Math.max(8.5, topLayer.gamma - 9.807) : 8.5;

        let phi_rad_seis = (phiInfoSeis.avgPhi * Math.PI) / 180.0;
        let Kp_seis = (1.0 + Math.sin(phi_rad_seis)) / (1.0 - Math.sin(phi_rad_seis));
        let gamma_sub_seis = gamma_sub_norm;

        let chi_norm = 1.0 / beta_norm;
        let eta_h_norm = (kh_norm * D) / chi_norm;
        let eta_norm = Math.pow(eta_h_norm / horizRes.EI, 0.2);
        let etaL_norm = eta_norm * L;

        let chi_seis = 1.0 / beta_seis;
        let eta_h_seis = (kh_seis * D) / chi_seis;
        let eta_seis = Math.pow(eta_h_seis / horizRes.EI, 0.2);
        let etaL_seis = eta_seis * L;

        const isSand = beta_soil === 'sand';

        function getBromsDetails(isNorm, Kp_v, gamma_v) {
            let Hu_val = 0;
            let formulaStr = "";
            let subStr = "";
            let fs_val = isNorm ? 3.0 : 2.0;
            let labelStr = isNorm ? "평상시" : "지진시";
            let subIndex = isNorm ? "norm" : "seis";

            if (isSand) {
                if (head_cond === 'fixed') {
                    formulaStr = `H<sub>u,${subIndex}</sub> 적용 산정식: H<sub>u</sub> = 2.38 &times; ( ${frac("M<sub>y</sub>", "K<sub>p</sub> &gamma;' D⁴")} )<sup>2/3</sup> &times; K<sub>p</sub> &gamma;' D³`;
                    subStr = `대입 과정: H<sub>u</sub> = 2.38 &times; ( ${frac(formatComma(My_kNm, 1), Kp_v.toFixed(3) + " &times; " + gamma_v.toFixed(1) + " &times; " + D.toFixed(3) + "⁴")} )<sup>2/3</sup> &times; ${Kp_v.toFixed(3)} &times; ${gamma_v.toFixed(1)} &times; ${D.toFixed(3)}³`;
                    Hu_val = 2.38 * Math.pow(My_kNm / (Kp_v * gamma_v * Math.pow(D, 4)), 2/3) * (Kp_v * gamma_v * Math.pow(D, 3));
                } else {
                    formulaStr = `{ ${frac("H<sub>u</sub>", "K<sub>p</sub> &gamma;' D³")} } [ ${frac("h", "D")} + 0.544 { ${frac("H<sub>u</sub>", "K<sub>p</sub> &gamma;' D³")} }<sup>1/2</sup> ] = { ${frac("M<sub>y</sub>", "K<sub>p</sub> &gamma;' D⁴")} }`;
                    subStr = `{ ${frac("H<sub>u</sub>", Kp_v.toFixed(3) + " &times; " + gamma_v.toFixed(1) + " &times; " + D.toFixed(3) + "³")} } [ ${frac("0", D.toFixed(3))} + 0.544 { ${frac("H<sub>u</sub>", Kp_v.toFixed(3) + " &times; " + gamma_v.toFixed(1) + " &times; " + D.toFixed(3) + "³")} }<sup>1/2</sup> ] = { ${frac(formatComma(My_kNm, 1), Kp_v.toFixed(3) + " &times; " + gamma_v.toFixed(1) + " &times; " + D.toFixed(3) + "⁴")} }`;
                    Hu_val = 2.38 * Math.pow(My_kNm / (Kp_v * gamma_v * Math.pow(D, 4)), 2/3) * (Kp_v * gamma_v * Math.pow(D, 3));
                }
            } else {
                let cu_val = topLayer.c_val || 10;
                if (head_cond === 'fixed') {
                    formulaStr = `{ ${frac("H<sub>u</sub>", "c<sub>u</sub> D²")} }² + 27 { ${frac("H<sub>u</sub>", "c<sub>u</sub> D²")} } = 36 ( ${frac("M<sub>y</sub>", "c<sub>u</sub> D³")} )`;
                    subStr = `{ ${frac("H<sub>u</sub>", cu_val.toFixed(1) + " &times; " + D.toFixed(3) + "²")} }² + 27 { ${frac("H<sub>u</sub>", cu_val.toFixed(1) + " &times; " + D.toFixed(3) + "²")} } = 36 ( ${frac(formatComma(My_kNm, 1), cu_val.toFixed(1) + " &times; " + D.toFixed(3) + "³")} )`;
                    let C_term = -36 * (My_kNm / (cu_val * Math.pow(D, 3)));
                    let x_val = (-27 + Math.sqrt(27**2 - 4 * C_term)) / 2;
                    Hu_val = x_val * cu_val * Math.pow(D, 2);
                } else {
                    formulaStr = `{ ${frac("H<sub>u</sub>", "c<sub>u</sub> D²")} }² + 27 { ${frac("H<sub>u</sub>", "c<sub>u</sub> D²")} } = 18 ( ${frac("M<sub>y</sub>", "c<sub>u</sub> D³")} )`;
                    subStr = `{ ${frac("H<sub>u</sub>", cu_val.toFixed(1) + " &times; " + D.toFixed(3) + "²")} }² + 27 { ${frac("H<sub>u</sub>", cu_val.toFixed(1) + " &times; " + D.toFixed(3) + "²")} } = 18 ( ${frac(formatComma(My_kNm, 1), cu_val.toFixed(1) + " &times; " + D.toFixed(3) + "³")} )`;
                    let C_term = -18 * (My_kNm / (cu_val * Math.pow(D, 3)));
                    let x_val = (-27 + Math.sqrt(27**2 - 4 * C_term)) / 2;
                    Hu_val = x_val * cu_val * Math.pow(D, 2);
                }
            }

            let Ha_val = Hu_val / fs_val;
            return { labelStr, subIndex, formulaStr, subStr, Hu_val, Ha_val, fs_val };
        }

        let bromsNormRes = getBromsDetails(true, Kp_norm, gamma_sub_norm);
        let bromsSeisRes = getBromsDetails(false, Kp_seis, gamma_sub_seis);

        let Ha_broms_norm = bromsNormRes.Ha_val;
        let Ha_broms_seis = bromsSeisRes.Ha_val;

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

        let disp_norm_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_norm * beta_norm) / (kh_norm * D)) * 1000.0;
        let disp_seis_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_seis * beta_seis) / (kh_seis * D)) * 1000.0;

        const ratio_disp_norm = (disp_norm_mm / allow_h_disp_norm) * 100.0;
        const ratio_disp_seis = (disp_seis_mm / allow_h_disp_seis) * 100.0;

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
            <div style="font-weight:bold; margin-top:6px; margin-bottom:6px; color:#2c3e50;">■ 극한지반 반력법에 의한 수평지지력 산정 (말뚝머리 고정)</div>
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
            <div style="font-weight:bold; margin-top:6px; margin-bottom:6px; color:#2c3e50;">■ 극한지반 반력법에 의한 수평지지력 산정 (말뚝머리 자유)</div>
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
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = 9 c<sub>u</sub> D'² [ { 4(h/D')² + 2(L/D')² + 4(h/D')(L/D') + 6(h/D') + 4.5 }<sup>1/2</sup> - { 2(h/D') + (L/D') } ]</td>
                            <td>${activeKey === 'clay_1' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'clay_2' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>중간</td>
                            <td style="text-align:left; padding-left:10px;">-</td>
                            <td>${activeKey === 'clay_2' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'clay_3' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>&beta;L &gt; 2.25</td>
                            <td style="text-align:left; padding-left:10px;">{ H<sub>u</sub> / (c<sub>u</sub> D'²) }² + { 18(h/D') + 27 }{ H<sub>u</sub> / (c<sub>u</sub> D'²) } = 18 { M<sub>y</sub> / (c<sub>u</sub> D'³) }</td>
                            <td>${activeKey === 'clay_3' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_1' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td rowspan="3" style="vertical-align:middle;">사질토</td>
                            <td>&eta;L &lt; 2</td>
                            <td style="text-align:left; padding-left:10px;">H<sub>u</sub> = ( K<sub>p</sub> &gamma;' D' L² ) / { 2 (1 + h/L) }</td>
                            <td>${activeKey === 'sand_1' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_2' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td>2 &le; &eta;L &le; 4</td>
                            <td style="text-align:left; padding-left:10px;">-</td>
                            <td>${activeKey === 'sand_2' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                        <tr style="${activeKey === 'sand_3' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                            <td style="color:#27ae60;">&eta;L &gt; 4</td>
                            <td style="text-align:left; padding-left:10px;">{ H<sub>u</sub> / (K<sub>p</sub> &gamma;' D'³) } [ h/D' + 0.544 { H<sub>u</sub> / (K<sub>p</sub> &gamma;' D'³) }<sup>1/2</sup> ] = { M<sub>y</sub> / (K<sub>p</sub> &gamma;' D'⁴) }</td>
                            <td>${activeKey === 'sand_3' ? '<span style="color:#27ae60; font-size:1.2em; font-weight:bold;">O</span>' : '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
        }

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
            
            const E_c = user_Ep; 

            const ec_em = E_c / E_m;
            const dr_br = D_r / B_r;
            const I_ps = getIps(dr_br, ec_em);

            finalS_norm = P_norm * ( (I_ps / (D_r * E_m)) + (L_s / (Ac_net * E_c)) ) * 1000;
            finalS_seis = P_seis * ( (I_ps / (D_r * E_m)) + (L_s / (Ac_net * E_c)) ) * 1000;

            ratio_settle_norm = (finalS_norm / allow_settle) * 100.0;
            ratio_settle_seis = (finalS_seis / allow_settle) * 100.0;

            const svgWidth = 380, svgHeight = 440;
            const padX = 55, padY = 40;
            const plotW = svgWidth - padX - 25, plotH = svgHeight - padY - 45;
            const logMin = -1.0; 
            const logMax = Math.log10(2.0); 

            const getPx = (x) => padX + (Math.max(0, Math.min(5, x)) / 5.0) * plotW;
            const getPy = (y) => {
                let clampedY = Math.max(0.1, Math.min(2.0, y));
                let logY = Math.log10(clampedY);
                return padY + plotH - ((logY - logMin) / (logMax - logMin)) * plotH;
            };

            const gridLinesY = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2.0];
            let yGridStr = gridLinesY.map(y => {
                let py = getPy(y);
                let isMain = (y === 0.1 || y === 0.2 || y === 0.5 || y === 1.0 || y === 2.0);
                return `<line x1="${padX}" y1="${py}" x2="${padX+plotW}" y2="${py}" stroke="#d0d0d0" stroke-width="${isMain?1.2:0.6}"/>
                        <text x="${padX-7}" y="${py+4}" font-size="11" text-anchor="end" fill="#333" font-weight="${isMain?'bold':'normal'}">${y.toFixed(1)}</text>`;
            }).join('');

            const gridLinesX = [0, 1, 2, 3, 4, 5];
            let xGridStr = gridLinesX.map(x => {
                let px = getPx(x);
                return `<line x1="${px}" y1="${padY}" x2="${px}" y2="${padY+plotH}" stroke="#d0d0d0" stroke-width="1"/>
                        <text x="${px}" y="${padY+plotH+16}" font-size="11" text-anchor="middle" fill="#333" font-weight="bold">${x}</text>`;
            }).join('');

            const curvesData = [
                { r: 0.2, lbl: '0.2', pts: [[0, 0.55], [0.3, 1.10], [0.6, 1.25], [1, 1.30], [2, 1.35], [3, 1.38], [5, 1.45]] },
                { r: 0.5, lbl: '0.5', pts: [[0, 0.55], [0.5, 0.65], [1, 0.68], [2, 0.70], [3, 0.71], [5, 0.73]] },
                { r: 1.0, lbl: '1',   pts: [[0, 0.53], [1, 0.53], [2, 0.53], [3, 0.53], [5, 0.53]] },
                { r: 2.0, lbl: '2',   pts: [[0, 0.53], [0.5, 0.42], [1, 0.38], [2, 0.36], [3, 0.35], [5, 0.33]] },
                { r: 10,  lbl: '10',  pts: [[0, 0.53], [0.5, 0.30], [1, 0.25], [2, 0.21], [3, 0.19], [5, 0.17]] },
                { r: 50,  lbl: '50',  pts: [[0, 0.53], [0.5, 0.27], [1, 0.21], [2, 0.17], [3, 0.15], [5, 0.13]] },
                { r: 1000, lbl: '∞',  pts: [[0, 0.53], [0.5, 0.24], [1, 0.18], [2, 0.14], [3, 0.12], [5, 0.09]] }
            ];

            let pathStr = curvesData.map(c => {
                let d = c.pts.map((p, i) => `${i===0?'M':'L'} ${getPx(p[0])} ${getPy(p[1])}`).join(' ');
                let lastPt = c.pts[c.pts.length-1];
                return `<path d="${d}" fill="none" stroke="#111111" stroke-width="1.8"/>
                        <text x="${getPx(lastPt[0])+3}" y="${getPy(lastPt[1])+4}" font-size="11" font-weight="bold" fill="#111">${c.lbl}</text>`;
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
                <div class="section-title">[검증 3] 현장타설말뚝(암반소켓) 연직침하량 산정 (Pells & Turner, 1979)</div>
                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                    <strong>▶ 그래프 보간 산출 영향계수 (I<sub>ps</sub>) = <span style="font-weight:bold; color:#003399; font-size:1.1em;">${I_ps.toFixed(3)}</span></strong><br>
                    <div style="margin-top: 6px; line-height: 1.6; font-size: 0.9em; color: #2c3e50;">
                        &bull; 콘크리트 강도 조건: <strong>${conc_str_detail}</strong><br>
                        &bull; 콘크리트 탄성계수 (E<sub>c</sub> = E<sub>p</sub>) : <strong>${formatComma(Math.round(E_c))} kPa</strong> (수평 해석 입력 E<sub>p</sub> 적용)<br>
                        &bull; 암반 변형계수 (E<sub>m</sub>) : <strong>${formatComma(Math.round(E_m))} kPa</strong><br>
                        &bull; 강성비 (${frac("E<sub>c</sub>", "E<sub>m</sub>")}) : ${frac(formatComma(Math.round(E_c)), formatComma(Math.round(E_m)))} = <strong>${ec_em.toFixed(2)}</strong><br>
                        &bull; 근입비 (${frac("D<sub>r</sub>", "B<sub>r</sub>")}) : ${frac(D_r.toFixed(2), B_r.toFixed(2))} = <strong>${dr_br.toFixed(2)}</strong>
                    </div>
                    
                    <div style="text-align:center; margin: 15px 0;">
                        <svg width="${svgWidth}" height="${svgHeight}" style="background:white; border:1px solid #555; border-radius:2px;">
                            <defs>
                                <radialGradient id="redSphereGrad" cx="35%" cy="35%" r="65%">
                                    <stop offset="0%" stop-color="#ff9999"/>
                                    <stop offset="40%" stop-color="#cc0000"/>
                                    <stop offset="100%" stop-color="#660000"/>
                                </radialGradient>
                                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.4"/>
                                </filter>
                            </defs>

                            ${yGridStr} ${xGridStr} ${pathStr}
                            <rect x="${padX}" y="${padY}" width="${plotW}" height="${plotH}" fill="none" stroke="#111" stroke-width="2"/>
                            
                            <text x="${padX-35}" y="${padY + plotH/2}" transform="rotate(-90 ${padX-35},${padY + plotH/2})" font-size="14" font-weight="bold" fill="#111" text-anchor="middle">Ips</text>
                            <text x="${padX + plotW/2}" y="${svgHeight - 10}" font-size="13" font-weight="bold" fill="#111" text-anchor="middle">Dr / Br</text>
                            
                            <circle cx="${ptX}" cy="${ptY}" r="7" fill="url(#redSphereGrad)" filter="url(#dropShadow)"/>
                            <rect x="${ptX - 25}" y="${ptY - 22}" width="50" height="18" fill="#ffffff" fill-opacity="0.9" rx="3" stroke="#e74c3c" stroke-width="1"/>
                            <text x="${ptX}" y="${ptY - 9}" font-size="12" font-weight="bold" fill="#003399" text-anchor="middle">${I_ps.toFixed(3)}</text>
                        </svg>
                    </div>
                </div>

                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                    <strong>■ Pells & Turner 침하량 산정결과</strong><br>
                    &nbsp;&nbsp;- 공식: S<sub>t</sub> = Q &times; [ ${frac("I<sub>ps</sub>", "D<sub>r</sub> &times; E<sub>m</sub>")} + ${frac("L<sub>s</sub>", "A &times; E<sub>c</sub>")} ]<br>
                    &nbsp;&nbsp;- <strong>평상시 침하량</strong> = ${formatComma(P_norm, 1)} &times; [ ${frac(I_ps.toFixed(3), D_r.toFixed(2) + " &times; " + formatComma(Math.round(E_m)))} + ${frac(L_s.toFixed(2), Ac_net.toFixed(5) + " &times; " + formatComma(Math.round(E_c)))} ] &times; 1000 = <strong><span style="color:#8e44ad;">${finalS_norm.toFixed(3)} mm</span></strong><br>
                    &nbsp;&nbsp;- <strong>지진시 침하량</strong> = ${formatComma(P_seis, 1)} &times; [ ${frac(I_ps.toFixed(3), D_r.toFixed(2) + " &times; " + formatComma(Math.round(E_m)))} + ${frac(L_s.toFixed(2), Ac_net.toFixed(5) + " &times; " + formatComma(Math.round(E_c)))} ] &times; 1000 = <strong><span style="color:#8e44ad;">${finalS_seis.toFixed(3)} mm</span></strong>
                </div>
            `;
        } else {
            let Pp_norm = Qu_total > 0 ? P_norm * (Qup / Qu_total) : P_norm * 0.5;
            let Ps_norm = Qu_total > 0 ? P_norm * (total_Qus / Qu_total) : P_norm * 0.5;
            let Pp_seis = Qu_total > 0 ? P_seis * (Qup / Qu_total) : P_seis * 0.5;
            let Ps_seis = Qu_total > 0 ? P_seis * (total_Qus / Qu_total) : P_seis * 0.5;

            let isTipSand = ['sand', 'gravel', 'weathered_rock'].includes(lastLayer.type);
            let Cp = isTipSand ? 0.09 : 0.03; 
            let Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
            let calc_qp = Math.max(q_p, 1.0);

            let S1_norm = ((Pp_norm + 0.5 * Ps_norm) * L) / (Ac_net * user_Ep) * 1000.0;
            let S2_norm = (Pp_norm * Cp) / (D * calc_qp) * 1000.0;
            let S3_norm = (Ps_norm * Cs) / (L * calc_qp) * 1000.0;
            finalS_norm = S1_norm + S2_norm + S3_norm;

            let S1_seis = ((Pp_seis + 0.5 * Ps_seis) * L) / (Ac_net * user_Ep) * 1000.0;
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
                <div class="section-title">[검증 3] 토사층 현장타설말뚝 연직 경험적 침하량 산정 (Vesic, 1977)</div>
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
                            <td style="font-weight:bold; color:${H_seis <= Ha_app_seis ? '#27ae60' : '#c0392b'};">${H_seis <= Ha_app_seis ? 'O.K' : 'N.G'} (${ratio_seis.toFixed(1)}%)</td>
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

            <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
                • 적용 산정식 : <strong>${qp_formula_name}</strong><br>
                • 최하단 지층 : <strong>${lastLayer.name}</strong> (N = ${raw_N_tip}, <i>q<sub>u</sub></i> = ${formatComma(qu_tip, 1)} kPa)<br>
                • 단위면적당 극한선단지지력 q<sub>p</sub> :<br>
                <div style="margin-left: 15px; background: #fdf2e9; padding: 10px; border-radius: 4px; margin: 6px 0; line-height: 1.6; font-size: 0.9em; color: #2c3e50; border: 1px solid #fae5d3;">${qp_calc_detail}</div>
                • 선단면적 <i>A<sub>p</sub></i> = &pi; &times; <i>D</i>² / 4 = <strong>${Ap.toFixed(5)} m²</strong><br>
                • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = <span style="font-weight:bold; color:#2980b9;">${formatComma(Qup, 1)} kN</span>

                ${extraRockTablesHtml}
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • 적용 산정식 : <strong>${qs_formula_name}</strong><br>
                • 토사층 평균 N치 (N<sub>60</sub>) : <strong style="color:#d35400;">${N_60.toFixed(1)}</strong><br>
                • 말뚝 둘레 <i>A<sub>s</sub></i> = &pi; &times; <i>D</i> = <strong>${As.toFixed(3)} m</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = <span style="font-weight:bold; color:#2980b9;">${formatComma(total_Qus, 1)} kN</span>

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

                ${extraRockQsTablesHtml}
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
                <strong>(3) 지반에 의한 극한지지력 및 허용지지력 (Q<sub>u</sub>, Q<sub>a,soil</sub>)</strong><br>
                • 극한지지력 Q<sub>u</sub> = Q<sub>up</sub> + Q<sub>us</sub> = <strong>${formatComma(Qu_total, 1)} kN</strong><br>
                • 평상시 허용지지력 (안전율 F.S = 3.0) : <strong>${formatComma(Qa_soil_norm, 1)} kN</strong><br>
                • 내진시 허용지지력 (안전율 F.S = 2.0) : <strong>${formatComma(Qa_soil_seis, 1)} kN</strong>
            </div>

            <div class="section-title">[검증 2] 현장타설말뚝 본체부 단면 내하력 (재료 허용압축하중 Qas) 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                ${qMatBaseDetailStr}<br>
                • 장경비 감소율 (&mu;) = max(0, ${L_over_D.toFixed(2)} - 60) = <strong>${mu1.toFixed(2)} %</strong><br>
                • <strong>말뚝 내하력 Q<sub>as</sub></strong> = (1 - ${frac("&mu;", "100")}) &times; Q<sub>mat_base</sub> = <span style="color:#2980b9; font-weight:bold; font-size:1.05em;">${formatComma(Qas, 1)} kN</span>

                <div style="margin-top: 12px; background: #fff; padding: 8px 10px; border-radius: 4px; border: 1px solid #d5d8dc;">
                    <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ 현장타설말뚝 장경비 및 감소계수 기준</div>
                    <div class="table-container" style="margin: 0;">
                        <table class="result-table" style="font-size: 0.82em; text-align: center; width: 100%;">
                            <thead>
                                <tr style="background-color: #eaeded;">
                                    <th>구 분</th>
                                    <th>n (장경비 감소 기준)</th>
                                    <th>장경비의 상한계 <sup>1)</sup></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="background-color: #e8f8f5; font-weight: bold;">
                                    <td>현장타설말뚝</td>
                                    <td>60</td>
                                    <td>80</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top: 5px; font-size: 0.8em; color: #7f8c8d; line-height: 1.3;">
                        1) 장경비에 의한 말뚝재료 허용응력 감소를 감안하더라도, 장경비 상한계 이상으로 설계하지 않는 것이 좋다.
                    </div>
                </div>
            </div>

            ${settlementHtmlStr}

            <div class="section-title">[검증 4] 수평방향 지지력 및 수평변위 상세 산정</div>
            
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">(1) 수평지반반력계수 k<sub>h</sub> 산정 (구조물기초설계기준(2018) 축차계산법)</div>
                <div style="margin-left: 10px; line-height:1.7;">
                    k<sub>h</sub> = k<sub>h0</sub> &times; ( ${frac("1", "0.3")} &times; B<sub>H</sub> )<sup>-3/4</sup> = { ${frac("1", "0.3")} &times; &alpha; &times; E<sub>0</sub> } &times; { ${frac("1", "0.3")} &times; (${frac("D", "&beta;")})<sup>1/2</sup> }<sup>-3/4</sup><br><br>
                    &bull; <strong>환산재하폭 B<sub>H</sub> = &radic;(${frac("D", "&beta;")}) = &radic;(${frac(D.toFixed(3), "0.20000")}) = <strong>${initBHVal.toFixed(3)} m</strong> (초기가정 &beta;<sub>0</sub> = 0.20000 m<sup>-1</sup>)</strong><br>
                    &bull; <strong>적용 추정계수 &alpha;: 평상시 = ${horizRes.alphaNorm}, 지진시 = ${horizRes.alphaSeis} (평상시의 2배 적용)</strong>
                </div>

                <div style="font-weight:bold; margin-top:10px; color:#2c3e50;">[평상시 축차계산 과정 (&alpha; = ${horizRes.alphaNorm})]</div>
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
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${formatComma(Math.round(s.E0))}</td><td>${formatComma(s.kh, 1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="font-weight:bold; margin-top:10px; color:#2c3e50;">[지진시 축차계산 과정 (&alpha; = ${horizRes.alphaSeis})]</div>
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
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${formatComma(Math.round(s.E0))}</td><td>${formatComma(s.kh, 1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">(2) 수평지반반력계수 k<sub>h</sub> 산정 (후쿠오카 공식 축차계산법)</div>
                <div style="margin-left: 10px; line-height:1.7;">
                    k<sub>h</sub> = 0.691 &times; N<sup>0.406</sup> &times; 9,806.65 (kN/m³)<br>
                    &bull; 초기가정 &beta;<sub>0</sub> = 0.20000 m<sup>-1</sup> (&ndash; 후쿠오카 공식은 계수 &alpha;의 영향이 없어 상시/지진시 산정결과가 동일함)
                </div>

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
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${formatComma(s.kh, 1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <br>&bull; <strong>최종 적용 k<sub>h</sub> (구조물기초설계기준(2018) 및 후쿠오카 공식 중 최소값 선택) :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 k<sub>h,norm</sub> = <strong><span style="color:#27ae60;">${formatComma(kh_norm, 1)} kN/m³</span></strong> (&beta; = ${beta_norm.toFixed(5)} m<sup>-1</sup>) &rArr; [적용 산정식: ${horizRes.kh_norm_source}]<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 k<sub>h,seis</sub> = <strong><span style="color:#27ae60;">${formatComma(kh_seis, 1)} kN/m³</span></strong> (&beta; = ${beta_seis.toFixed(5)} m<sup>-1</sup>) &rArr; [적용 산정식: ${horizRes.kh_seis_source}]
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">(3) Broms 극한평형법 매개변수 및 1/&beta; 심도 가중평균 지반정수 산정</div>
                <div style="margin-left: 10px; line-height:1.7;">
                    &bull; 항복휨응력 (f<sub>y</sub>) 조건: ${fy_detail_str}<br>
                    &bull; 두부 구속조건: <strong>${head_cond === 'fixed' ? '두부고정 (Fixed)' : '두부자유 (Free)'}</strong> / 상부 지층 구분: <strong>${isSand ? '사질토' : '점성토'}</strong><br>
                    &bull; 단면계수 (Z) = ${frac("&pi; &times; D³", "32")} = <strong>${Z_m3.toFixed(5)} m³</strong><br>
                    &bull; 항복모멘트 (M<sub>y</sub>) = f<sub>y</sub> &times; Z = ${formatComma(fy_kNm2)} &times; ${Z_m3.toFixed(5)} = <strong>${formatComma(My_kNm, 1)} kN·m</strong>
                </div>

                <div style="margin-top: 10px; background: #fafafa; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">
                    <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">■ 1/&beta; 심도 내 가중평균 내부마찰각 (&phi;<sub>avg</sub>) 및 수동토압계수 (K<sub>p</sub>) 산출과정</div>
                    
                    <div style="font-weight:bold; margin-top:6px; margin-bottom:4px; color:#2c3e50; font-size:0.88em;">1) 평상시 (1/&beta;<sub>norm</sub> = ${(1/beta_norm).toFixed(3)} m 심도 범위)</div>
                    <div class="table-container" style="margin: 4px 0 12px 0;">
                        <table class="result-table" style="font-size:0.82em; text-align:center; width:100%;">
                            <thead>
                                <tr style="background:#eaeded;">
                                    <th>대상 지층</th>
                                    <th>적용 층후 dz (m)</th>
                                    <th>내부마찰각 &phi; (&deg;)</th>
                                    <th>&phi; &times; dz (&deg;&middot;m)</th>
                                    <th>가중평균 &phi;<sub>avg</sub></th>
                                    <th>수동토압계수 K<sub>p</sub></th>
                                    <th>수중단위중량 &gamma;'</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${phiInfoNorm.rows.map((r, i) => `
                                    <tr>
                                        <td>${r.name}</td>
                                        <td>${r.dz.toFixed(2)}</td>
                                        <td>${r.phi.toFixed(1)}&deg;</td>
                                        <td>${r.phi_dz.toFixed(2)}</td>
                                        ${i === 0 ? `
                                            <td rowspan="${phiInfoNorm.rows.length}" style="vertical-align:middle; font-weight:bold; color:#2980b9;">${phiInfoNorm.avgPhi.toFixed(2)}&deg;</td>
                                            <td rowspan="${phiInfoNorm.rows.length}" style="vertical-align:middle; font-weight:bold;">${Kp_norm.toFixed(3)}</td>
                                            <td rowspan="${phiInfoNorm.rows.length}" style="vertical-align:middle; font-weight:bold;">${gamma_sub_norm.toFixed(1)} kN/m³</td>
                                        ` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background:#f4f6f7; font-weight:bold;">
                                    <td>합 계 (&sum;)</td>
                                    <td>${phiInfoNorm.sumCovered.toFixed(2)}</td>
                                    <td>-</td>
                                    <td>${phiInfoNorm.sumPhi.toFixed(2)}</td>
                                    <td colspan="3" style="text-align:left; padding-left:10px; font-weight:normal; font-size:0.88em; color:#555;">
                                        &bull; &phi;<sub>avg,norm</sub> = ${phiInfoNorm.sumPhi.toFixed(2)} / ${phiInfoNorm.sumCovered.toFixed(2)} = <strong>${phiInfoNorm.avgPhi.toFixed(2)}&deg;</strong><br>
                                        &bull; K<sub>p,norm</sub> = tan²(45&deg; + ${phiInfoNorm.avgPhi.toFixed(2)}&deg;/2) = <strong>${Kp_norm.toFixed(3)}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div style="font-weight:bold; margin-top:8px; margin-bottom:4px; color:#2c3e50; font-size:0.88em;">2) 지진시 (1/&beta;<sub>seis</sub> = ${(1/beta_seis).toFixed(3)} m 심도 범위)</div>
                    <div class="table-container" style="margin: 4px 0 6px 0;">
                        <table class="result-table" style="font-size:0.82em; text-align:center; width:100%;">
                            <thead>
                                <tr style="background:#eaeded;">
                                    <th>대상 지층</th>
                                    <th>적용 층후 dz (m)</th>
                                    <th>내부마찰각 &phi; (&deg;)</th>
                                    <th>&phi; &times; dz (&deg;&middot;m)</th>
                                    <th>가중평균 &phi;<sub>avg</sub></th>
                                    <th>수동토압계수 K<sub>p</sub></th>
                                    <th>수중단위중량 &gamma;'</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${phiInfoSeis.rows.map((r, i) => `
                                    <tr>
                                        <td>${r.name}</td>
                                        <td>${r.dz.toFixed(2)}</td>
                                        <td>${r.phi.toFixed(1)}&deg;</td>
                                        <td>${r.phi_dz.toFixed(2)}</td>
                                        ${i === 0 ? `
                                            <td rowspan="${phiInfoSeis.rows.length}" style="vertical-align:middle; font-weight:bold; color:#2980b9;">${phiInfoSeis.avgPhi.toFixed(2)}&deg;</td>
                                            <td rowspan="${phiInfoSeis.rows.length}" style="vertical-align:middle; font-weight:bold;">${Kp_seis.toFixed(3)}</td>
                                            <td rowspan="${phiInfoSeis.rows.length}" style="vertical-align:middle; font-weight:bold;">${gamma_sub_seis.toFixed(1)} kN/m³</td>
                                        ` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background:#f4f6f7; font-weight:bold;">
                                    <td>합 계 (&sum;)</td>
                                    <td>${phiInfoSeis.sumCovered.toFixed(2)}</td>
                                    <td>-</td>
                                    <td>${phiInfoSeis.sumPhi.toFixed(2)}</td>
                                    <td colspan="3" style="text-align:left; padding-left:10px; font-weight:normal; font-size:0.88em; color:#555;">
                                        &bull; &phi;<sub>avg,seis</sub> = ${phiInfoSeis.sumPhi.toFixed(2)} / ${phiInfoSeis.sumCovered.toFixed(2)} = <strong>${phiInfoSeis.avgPhi.toFixed(2)}&deg;</strong><br>
                                        &bull; K<sub>p,seis</sub> = tan²(45&deg; + ${phiInfoSeis.avgPhi.toFixed(2)}&deg;/2) = <strong>${Kp_seis.toFixed(3)}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div style="margin-top:10px; margin-left: 4px;">
                        &bull; <strong>말뚝 특성치 &eta; 및 &eta;L / &beta;L 판정 :</strong><br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 &eta; = <strong>${eta_norm.toFixed(3)} m<sup>-1</sup></strong>, &eta;L = <strong>${etaL_norm.toFixed(3)}</strong>, &beta;L = <strong>${(beta_norm*L).toFixed(3)}</strong> &rArr; <span style="text-decoration:underline; font-weight:bold;">${etaL_norm > 4 ? '긴말뚝(&eta;L > 4)' : '짧은말뚝'}</span><br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 &eta; = <strong>${eta_seis.toFixed(3)} m<sup>-1</sup></strong>, &eta;L = <strong>${etaL_seis.toFixed(3)}</strong>, &beta;L = <strong>${(beta_seis*L).toFixed(3)}</strong> &rArr; <span style="text-decoration:underline; font-weight:bold;">${etaL_seis > 4 ? '긴말뚝(&eta;L > 4)' : '짧은말뚝'}</span>
                    </div>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">(4) Broms 극한평형법 수평 지지력 산정</div>
                ${bromsTableHtml}

                <div style="margin-top: 10px; font-weight:bold; color:#2c3e50;">&bull; Broms 허용수평지지력 (H<sub>a,broms</sub>) 조건별 수치 대입 및 계산 결과 :</div>
                <div style="margin-left: 10px; line-height:1.7;">
                    <strong>- 평상시 H<sub>u,norm</sub> 적용 산정식 :</strong> ${bromsNormRes.formulaStr}<br>
                    &nbsp;&nbsp;&bull; 대입 과정: ${bromsNormRes.subStr}<br>
                    &nbsp;&nbsp;H<sub>u,norm</sub> = <strong>${formatComma(bromsNormRes.Hu_val, 1)} kN/본</strong><br>
                    &nbsp;&nbsp;H<sub>a,broms</sub> = ${frac("H<sub>u</sub>", "3.0")} = ${frac(formatComma(bromsNormRes.Hu_val, 1), "3.0")} = <strong><span style="color:#2980b9;">${formatComma(Ha_broms_norm, 1)} kN/본</span> (안전율 F.S = 3.0)</strong><br><br>

                    <strong>- 지진시 H<sub>u,seis</sub> 적용 산정식 :</strong> ${bromsSeisRes.formulaStr}<br>
                    &nbsp;&nbsp;&bull; 대입 과정: ${bromsSeisRes.subStr}<br>
                    &nbsp;&nbsp;H<sub>u,seis</sub> = <strong>${formatComma(bromsSeisRes.Hu_val, 1)} kN/본</strong><br>
                    &nbsp;&nbsp;H<sub>a,broms</sub> = ${frac("H<sub>u</sub>", "2.0")} = ${frac(formatComma(bromsSeisRes.Hu_val, 1), "2.0")} = <strong><span style="color:#2980b9;">${formatComma(Ha_broms_seis, 1)} kN/본</span> (안전율 F.S = 2.0)</strong>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">(5) Chang 탄성지반반력법 수평 지지력 산정</div>
                <div style="margin-left: 10px; line-height:1.7;">
                    H<sub>a,chang</sub> = ${frac("k<sub>h</sub> &times; D &times; &delta;<sub>sa</sub>", "&beta;")}<br>
                    &bull; 허용수평변위량 &delta;<sub>sa</sub>: 평상시 = ${allow_h_disp_norm.toFixed(1)} mm (${(allow_h_disp_norm/1000).toFixed(4)} m), 지진시 = ${allow_h_disp_seis.toFixed(1)} mm (${(allow_h_disp_seis/1000).toFixed(4)} m)<br><br>

                    <strong>&bull; 수치 대입 계산 결과 :</strong><br>
                    &nbsp;&nbsp;- 평상시 H<sub>a,chang</sub> = ${frac(formatComma(kh_norm, 1) + " &times; " + D.toFixed(3) + " &times; " + (allow_h_disp_norm/1000).toFixed(4), beta_norm.toFixed(5))} = <strong><span style="color:#2980b9;">${formatComma(Ha_chang_norm, 1)} kN/본</span></strong><br>
                    &nbsp;&nbsp;- 지진시 H<sub>a,chang</sub> = ${frac(formatComma(kh_seis, 1) + " &times; " + D.toFixed(3) + " &times; " + (allow_h_disp_seis/1000).toFixed(4), beta_seis.toFixed(5))} = <strong><span style="color:#2980b9;">${formatComma(Ha_chang_seis, 1)} kN/본</span></strong>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">(6) 수평 허용지지력 비교 및 최종 산정값</div>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.88em; text-align:center;">
                        <thead>
                            <tr style="background:#e8f8f5;">
                                <th>구분</th><th>Broms법 H<sub>a</sub> (kN)</th><th>Chang법 H<sub>a</sub> (kN)</th><th>최종 적용 H<sub>a</sub> (kN)</th><th>적용 산정식</th><th>작용 수평력 H (kN)</th><th>판정</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>평상시</td><td>${formatComma(Ha_broms_norm, 1)}</td><td>${formatComma(Ha_chang_norm, 1)}</td><td style="font-weight:bold; color:#27ae60;">${formatComma(Ha_app_norm, 1)}</td><td style="font-weight:bold; color:#2980b9;">${Ha_norm_source}</td><td>${formatComma(H_norm, 1)}</td><td style="font-weight:bold; color:${H_norm <= Ha_app_norm ? '#27ae60' : '#c0392b'};">${H_norm <= Ha_app_norm ? 'O.K' : 'N.G'}</td>
                            </tr>
                            <tr>
                                <td>지진시</td><td>${formatComma(Ha_broms_seis, 1)}</td><td>${formatComma(Ha_chang_seis, 1)}</td><td style="font-weight:bold; color:#27ae60;">${formatComma(Ha_app_seis, 1)}</td><td style="font-weight:bold; color:#2980b9;">${Ha_seis_source}</td><td>${formatComma(H_seis, 1)}</td><td style="font-weight:bold; color:${H_seis <= Ha_app_seis ? '#27ae60' : '#c0392b'};">${H_seis <= Ha_app_seis ? 'O.K' : 'N.G'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; margin-bottom:6px; color:#2c3e50;">(7) Chang 탄성식에 의한 지표면 수평발생변위량 (&delta;) 산정</div>
                <div style="margin-left: 10px; line-height:1.7;">
                    &delta; = ${frac("H &times; &beta;", "k<sub>h</sub> &times; D")} &times; 1000 (mm)<br><br>

                    <strong>&bull; 수치 대입 계산 결과 :</strong><br>
                    &nbsp;&nbsp;- 평상시 발생변위 &delta;<sub>norm</sub> = ${frac(formatComma(H_norm, 1) + " &times; " + beta_norm.toFixed(5), formatComma(kh_norm, 1) + " &times; " + D.toFixed(3))} &times; 1000 = <strong><span style="color:#d35400;">${disp_norm_mm.toFixed(2)} mm</span> (&le; ${allow_h_disp_norm.toFixed(1)} mm, ${disp_norm_mm <= allow_h_disp_norm ? 'O.K' : 'N.G'})</strong><br>
                    &nbsp;&nbsp;- 지진시 발생변위 &delta;<sub>seis</sub> = ${frac(formatComma(H_seis, 1) + " &times; " + beta_seis.toFixed(5), formatComma(kh_seis, 1) + " &times; " + D.toFixed(3))} &times; 1000 = <strong><span style="color:#d35400;">${disp_seis_mm.toFixed(2)} mm</span> (&le; ${allow_h_disp_seis.toFixed(1)} mm, ${disp_seis_mm <= allow_h_disp_seis ? 'O.K' : 'N.G'})</strong>
                </div>
            </div>
        `;
    }
}
