/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  AlertTriangle, 
  Info, 
  ClipboardCheck, 
  Activity,
  Microscope,
  Dna
} from 'lucide-react';

// --- Types ---

type SaltStatus = 'Normal' | 'SaltWasting' | 'Hypokalemia';

interface AppState {
  step: 'landing' | 'questionnaire' | 'result';
  inputs: {
    palpableGonads?: boolean;
    mullerianStructure?: boolean;
    genitalAsymmetry?: boolean;
    maternalVirilisation?: boolean;
    amh?: number;
    testosterone?: number;
    seventeenOHP?: number;
    saltStatus?: SaltStatus;
    testoDhtRatio?: number;
  };
  history: string[]; // To track navigation for "Back" button
}

interface Diagnosis {
  name: string;
  fullName: string;
  description: string;
  reasoning: string;
  suggestedEvaluations: string[];
  isEmergency?: boolean;
  emergencyNote?: string;
}

// --- Constants & Data ---

const CLINICAL_INFO: Record<string, { title: string, description: string, howTo: string }> = {
  palpableGonads: {
    title: "Sờ tuyến sinh dục",
    description: "Tuyến sinh dục sờ thấy thường là tinh hoàn. Nếu sờ thấy ở bẹn hoặc bìu, khả năng cao có mô tinh hoàn.",
    howTo: "Cách khám: Dùng hai ngón tay sờ nhẹ nhàng từ lỗ bẹn nông dọc theo ống bẹn xuống vùng bìu hoặc môi lớn. Ghi nhận vị trí, kích thước và mật độ."
  },
  mullerianStructure: {
    title: "Cấu trúc Müllerian",
    description: "Bao gồm tử cung, vòi trứng và phần trên âm đạo. Sự hiện diện của chúng cho thấy nồng độ AMH thấp hoặc không có tác dụng trong phôi thai.",
    howTo: "Chẩn đoán: Thường xác định qua siêu âm đường bụng. Cần bác sĩ chẩn đoán hình ảnh giàu kinh nghiệm để tìm tử cung nhỏ ở trẻ sơ sinh."
  },
  amh: {
    title: "Xét nghiệm AMH",
    description: "Anti-Müllerian Hormone được tiết ra bởi tế bào Sertoli của tinh hoàn. Giúp đánh giá sự hiện diện và chức năng của mô tinh hoàn.",
    howTo: "Tham chiếu: AMH cao (>10 ng/mL) gợi ý mô tinh hoàn hoạt động. AMH không phát hiện được gợi ý không có tinh hoàn (Anorchia) hoặc XX DSD."
  },
  testosterone: {
    title: "Xét nghiệm Testosterone",
    description: "Hormone nam chính, đánh giá khả năng bài tiết của tế bào Leydig.",
    howTo: "Tham chiếu: Ở trẻ sơ sinh nam (đỉnh sơ sinh), Testosterone thường > 100 ng/dL. Nếu thấp hơn, cần nghĩ đến khiếm khuyết sinh tổng hợp hoặc loạn sản."
  },
  seventeenOHP: {
    title: "Xét nghiệm 17-OHP",
    description: "Chỉ số quan trọng nhất để tầm soát Tăng sản thượng thận bẩm sinh (CAH).",
    howTo: "Tham chiếu: > 30 ng/mL rất gợi ý 21-OHD. Cần lấy máu sau 48h tuổi để tránh dương tính giả do đỉnh sinh lý sau sinh."
  }
};

const ABBREVIATIONS: Record<string, string> = {
  '3BHSD': 'Thiếu hụt 3 Beta hydroxysteroid dehydrogenase',
  '5ARD2': 'Thiếu hụt 5 Alpha reductase II',
  '17OHD': 'Thiếu hụt 17-alpha-hydroxylase',
  '11OHD': 'Thiếu hụt 11-beta-hydroxylase',
  '21OHD': 'Thiếu hụt 21-hydroxylase',
  'PAIS': 'Hội chứng kháng androgen bán phần',
  'StAR': 'Protein điều hòa cấp tính steroid',
  'SCC': 'Enzyme cắt chuỗi bên Cholesterol',
  'POR': 'P450 oxidoreductase deficiency',
  'SW': 'Dạng mất muối (Salt-wasting)',
  'SV': 'Dạng nam hóa đơn thuần (Simple-virilizing)',
};

// --- Helper Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-[2rem] shadow-xl shadow-slate-100/50 border border-slate-50 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  className = "" 
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger',
  disabled?: boolean,
  className?: string
}) => {
  const variants = {
    primary: 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-100',
    secondary: 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-100',
    outline: 'bg-white text-slate-700 border-2 border-slate-100 hover:border-rose-500 hover:text-rose-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-red-100',
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-8 py-4 rounded-3xl font-black transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 shadow-lg ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>({
    step: 'landing',
    inputs: {},
    history: [],
  });

  const reset = () => {
    setState({
      step: 'landing',
      inputs: {},
      history: [],
    });
  };

  const startQuestionnaire = () => {
    setState(prev => ({ ...prev, step: 'questionnaire' }));
  };

  const updateInput = (key: keyof AppState['inputs'], value: any) => {
    setState(prev => ({
      ...prev,
      inputs: { ...prev.inputs, [key]: value }
    }));
  };

  // --- Logic Engine ---

  const diagnosis = useMemo((): Diagnosis | null => {
    const { inputs } = state;
    
    // Branch A: Palpable Gonads = YES
    if (inputs.palpableGonads === true) {
      if (inputs.mullerianStructure === true) {
        if (inputs.genitalAsymmetry === true) {
          return {
            name: 'Ovotesticular DSD',
            fullName: 'Rối loạn phát triển giới tính dạng Ovotesticular',
            description: 'Có sự hiện diện của cả mô tinh hoàn và mô buồng trứng trên cùng một cá thể.',
            reasoning: 'Vì sờ thấy tuyến sinh dục (có mô tinh hoàn) nhưng lại có cấu trúc Müllerian (tử cung) và biểu hiện bất đối xứng, gợi ý sự phát triển không đồng nhất của hai bên tuyến sinh dục.',
            suggestedEvaluations: ['Xét nghiệm Di truyền (Karyotype)', 'Sinh thiết tuyến sinh dục', 'Siêu âm ổ bụng chuyên sâu'],
          };
        } else if (inputs.genitalAsymmetry === false && inputs.amh !== undefined) {
          if (inputs.amh < 10) {
            return {
              name: 'Dysgenesis',
              fullName: 'Loạn sản tuyến sinh dục (Gonadal Dysgenesis)',
              description: 'Tuyến sinh dục phát triển không hoàn thiện.',
              reasoning: 'Sờ thấy tuyến sinh dục nhưng có tử cung và AMH thấp (<10), chứng tỏ mô tinh hoàn hiện diện nhưng chức năng tiết AMH bị suy giảm nặng do loạn sản.',
              suggestedEvaluations: ['Xét nghiệm Di truyền (Karyotype)', 'Đánh giá chức năng tuyến sinh dục'],
            };
          } else {
            return {
              name: 'AMH Resistance',
              fullName: 'Hội chứng tồn tại ống Müller (PMDS) / Kháng AMH',
              description: 'Cơ thể không đáp ứng với hormone AMH, dẫn đến tồn tại tử cung/vòi trứng ở trẻ có kiểu hình nam.',
              reasoning: 'Sờ thấy tuyến sinh dục và AMH cao (>10) nhưng vẫn có tử cung, chứng tỏ mô tinh hoàn hoạt động tốt nhưng cơ quan đích không đáp ứng với AMH.',
              suggestedEvaluations: ['Xét nghiệm gen AMH hoặc AMHR2', 'Phẫu thuật nội soi đánh giá'],
            };
          }
        }
      } else if (inputs.mullerianStructure === false && inputs.testosterone !== undefined) {
        if (inputs.testosterone < 100) {
          if (inputs.saltStatus === 'SaltWasting') {
            return {
              name: '3BHSD, StAR, or SCC',
              fullName: 'Khiếm khuyết sinh tổng hợp Steroid sớm',
              description: 'Thiếu hụt các enzyme quan trọng trong quá trình tạo hormone steroid từ cholesterol.',
              reasoning: 'Bệnh nhân kiểu hình nam (không tử cung) nhưng Testosterone thấp và có tình trạng mất muối, gợi ý khiếm khuyết enzyme ảnh hưởng đến cả vỏ thượng thận và tuyến sinh dục.',
              suggestedEvaluations: ['Định lượng các tiền chất steroid', 'Xét nghiệm gen tương ứng'],
              isEmergency: true,
              emergencyNote: 'Nguy cơ cơn mất muối cấp (Salt-wasting crisis). Cần theo dõi sát điện giải và điều trị bù dịch/hormone kịp thời.',
            };
          } else if (inputs.saltStatus === 'Hypokalemia') {
            return {
              name: '17OHD',
              fullName: ABBREVIATIONS['17OHD'],
              description: 'Dạng tăng huyết áp của tăng sản thượng thận bẩm sinh.',
              reasoning: 'Testosterone thấp kèm hạ Kali máu gợi ý sự tích tụ các tiền chất gây giữ muối và tăng huyết áp do thiếu hụt 17-alpha-hydroxylase.',
              suggestedEvaluations: ['Đo huyết áp', 'Định lượng Progesterone và 11-deoxycorticosterone'],
            };
          } else if (inputs.saltStatus === 'Normal') {
            return {
              name: 'Isolated Defect',
              fullName: 'Khiếm khuyết đơn độc (Isolated Leydig cell hypoplasia/defect)',
              description: 'Khiếm khuyết khu trú tại tế bào Leydig hoặc thụ thể LH.',
              reasoning: 'Testosterone thấp nhưng không có rối loạn điện giải, gợi ý khiếm khuyết chỉ khu trú tại quá trình sản xuất androgen của tinh hoàn.',
              suggestedEvaluations: ['Xét nghiệm Di truyền', 'Thử nghiệm kích thích hCG'],
            };
          }
        } else if (inputs.testosterone >= 100) {
          if (inputs.saltStatus === 'SaltWasting') {
            return {
              name: '3BHSD',
              fullName: ABBREVIATIONS['3BHSD'],
              description: 'Thiếu hụt enzyme 3-beta-hydroxysteroid dehydrogenase.',
              reasoning: 'Mặc dù Testosterone có thể đạt mức tối thiểu nhưng tình trạng mất muối nặng hướng tới thiếu hụt enzyme ảnh hưởng đến cả hai con đường steroid.',
              suggestedEvaluations: ['Tỷ lệ Delta-5/Delta-4 steroid', 'Xét nghiệm gen HSD3B2'],
              isEmergency: true,
              emergencyNote: 'Cảnh báo mất muối.',
            };
          } else if (inputs.saltStatus === 'Normal' && inputs.testoDhtRatio !== undefined) {
            if (inputs.testoDhtRatio > 10) {
              return {
                name: '5ARD2',
                fullName: ABBREVIATIONS['5ARD2'],
                description: 'Cơ thể không chuyển đổi được testosterone thành DHT (hormone nam mạnh hơn).',
                reasoning: 'Testosterone bình thường nhưng tỷ lệ T/DHT cao (>10) là dấu hiệu đặc trưng của thiếu hụt enzyme 5-alpha-reductase.',
                suggestedEvaluations: ['Xét nghiệm gen SRD5A2', 'Đánh giá lại ở tuổi dậy thì'],
              };
            } else {
              return {
                name: 'PAIS',
                fullName: ABBREVIATIONS['PAIS'],
                description: 'Tế bào giảm nhạy cảm với hormone nam.',
                reasoning: 'Testosterone và tỷ lệ T/DHT bình thường ở một trẻ có bộ phận sinh dục không điển hình gợi ý nguyên nhân tại thụ thể Androgen.',
                suggestedEvaluations: ['Xét nghiệm gen thụ thể Androgen (AR)', 'Xét nghiệm Di truyền'],
              };
            }
          }
        }
      }
    }
    
    // Branch B: Palpable Gonads = NO
    if (inputs.palpableGonads === false) {
      if (inputs.mullerianStructure === false && inputs.amh !== undefined) {
        if (inputs.amh === 0) {
          return {
            name: 'Anorchia',
            fullName: 'Hội chứng không có tinh hoàn (Vanishing Testis Syndrome)',
            description: 'Tinh hoàn bị thoái triển hoàn toàn trong quá trình bào thai.',
            reasoning: 'Không sờ thấy tuyến sinh dục, không có tử cung (chứng tỏ AMH từng hiện diện để làm thoái triển ống Muller) nhưng hiện tại AMH không phát hiện được, gợi ý tinh hoàn đã biến mất sau giai đoạn biệt hóa ban đầu.',
            suggestedEvaluations: ['Thử nghiệm kích thích hCG', 'Nội soi thăm dò nếu cần'],
          };
        }
      } else if (inputs.mullerianStructure === true) {
        if (inputs.maternalVirilisation === true) {
          return {
            name: 'Aromatase / POR',
            fullName: 'Thiếu hụt Aromatase hoặc POR',
            description: 'Rối loạn chuyển đổi androgen thành estrogen, ảnh hưởng cả mẹ và thai nhi.',
            reasoning: 'Sự nam hóa của cả mẹ và con gợi ý một khối u tiết androgen hoặc phổ biến hơn là thiếu hụt enzyme chuyển đổi androgen thành estrogen (Aromatase).',
            suggestedEvaluations: ['Định lượng Estrogen', 'Xét nghiệm gen CYP19A1 hoặc POR'],
          };
        } else if (inputs.maternalVirilisation === false && inputs.seventeenOHP !== undefined) {
          if (inputs.seventeenOHP > 30) {
            const isSW = inputs.saltStatus === 'SaltWasting';
            return {
              name: `21OHD (${isSW ? 'SW' : 'SV'})`,
              fullName: `${ABBREVIATIONS['21OHD']} - ${isSW ? ABBREVIATIONS['SW'] : ABBREVIATIONS['SV']}`,
              description: 'Dạng phổ biến nhất của tăng sản thượng thận bẩm sinh (CAH).',
              reasoning: 'Nồng độ 17-OHP rất cao (>30) là tiêu chuẩn vàng để chẩn đoán thiếu hụt 21-hydroxylase.',
              suggestedEvaluations: ['Xét nghiệm gen CYP21A2', 'Theo dõi điện giải đồ'],
              isEmergency: isSW,
              emergencyNote: isSW ? 'Cấp cứu mất muối! Cần can thiệp ngay lập tức.' : undefined,
            };
          } else if (inputs.seventeenOHP >= 10 && inputs.seventeenOHP <= 30) {
            if (inputs.saltStatus === 'SaltWasting') {
              return {
                name: '3BHSD',
                fullName: ABBREVIATIONS['3BHSD'],
                description: 'Thiếu hụt enzyme 3-beta-hydroxysteroid dehydrogenase.',
                reasoning: '17-OHP tăng nhẹ kèm mất muối ở trẻ không sờ thấy tuyến sinh dục gợi ý khiếm khuyết enzyme ở chặng sớm của sinh tổng hợp steroid.',
                suggestedEvaluations: ['Xét nghiệm gen HSD3B2'],
                isEmergency: true,
                emergencyNote: 'Nguy cơ mất muối.',
              };
            } else if (inputs.saltStatus === 'Hypokalemia') {
              return {
                name: '11OHD',
                fullName: ABBREVIATIONS['11OHD'],
                description: 'Thiếu hụt enzyme 11-beta-hydroxylase, gây nam hóa và cao huyết áp.',
                reasoning: '17-OHP tăng nhẹ kèm hạ Kali máu gợi ý sự tích tụ DOC gây giữ muối, đặc trưng của thiếu hụt 11-beta-hydroxylase.',
                suggestedEvaluations: ['Định lượng 11-deoxycortisol', 'Đo huyết áp'],
              };
            } else if (inputs.saltStatus === 'Normal') {
              return {
                name: 'SV 21OHD',
                fullName: `${ABBREVIATIONS['21OHD']} - ${ABBREVIATIONS['SV']}`,
                description: 'Tăng sản thượng thận bẩm sinh dạng nam hóa đơn thuần.',
                reasoning: '17-OHP tăng mức độ trung bình và điện giải bình thường hướng tới dạng nam hóa đơn thuần của thiếu hụt 21-hydroxylase.',
                suggestedEvaluations: ['Xét nghiệm gen CYP21A2'],
              };
            }
          } else if (inputs.seventeenOHP < 10) {
            return {
              name: 'Genetics',
              fullName: 'Cần xét nghiệm Di truyền sâu hơn',
              description: 'Các chỉ số sinh hóa cơ bản bình thường, cần đánh giá bộ nhiễm sắc thể và các gen DSD khác.',
              reasoning: 'Khi các xét nghiệm nội tiết phổ biến đều bình thường, nguyên nhân có thể nằm ở các đột biến gen hiếm gặp điều hòa sự biệt hóa tuyến sinh dục.',
              suggestedEvaluations: ['Karyotype', 'DSD Gene Panel', 'Đánh giá lại lâm sàng'],
            };
          }
        }
      }
    }

    return null;
  }, [state.inputs]);

  // --- UI Renderers ---

  const renderLanding = () => (
    <div className="max-w-2xl mx-auto py-12 px-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 inline-flex p-6 bg-rose-50 rounded-[2rem] text-rose-500 shadow-xl shadow-rose-100"
      >
        <Stethoscope size={64} />
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-5xl font-black text-slate-900 mb-4 tracking-tight"
      >
        DSD Dr. Son <span className="text-rose-500">1.0</span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-slate-600 mb-10 leading-relaxed font-medium"
      >
        Chào mừng bạn! Tôi là trợ lý ảo của Dr. Son, sẵn sàng hỗ trợ bạn tiếp cận chẩn đoán DSD một cách khoa học và thân thiện nhất.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 mb-12 text-left"
      >
        <Card className="p-5 flex gap-4 items-start">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Hướng dẫn từng bước</h3>
            <p className="text-sm text-slate-500">Các câu hỏi sẽ hiện ra linh hoạt dựa trên dữ liệu lâm sàng bạn cung cấp.</p>
          </div>
        </Card>
        <Card className="p-5 flex gap-4 items-start">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Cảnh báo cấp cứu</h3>
            <p className="text-sm text-slate-500">Nhận diện sớm các tình trạng nguy hiểm như mất muối (salt-wasting crisis).</p>
          </div>
        </Card>
      </motion.div>

      <Button onClick={startQuestionnaire} className="w-full sm:w-auto px-12 py-4 text-lg">
        Bắt đầu đánh giá <ChevronRight size={20} />
      </Button>

      <div className="mt-12 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic text-left">
        <div className="flex gap-2 mb-2 text-slate-700 font-semibold not-italic">
          <Info size={14} /> Lưu ý y tế:
        </div>
        Ứng dụng chỉ cung cấp thông tin tham khảo hỗ trợ ra quyết định lâm sàng và không thay thế cho chẩn đoán của bác sĩ chuyên khoa nội tiết nhi.
      </div>
    </div>
  );

  const renderQuestionnaire = () => {
    const { inputs } = state;

    // Determine current question based on state
    let questionContent = null;

    if (inputs.palpableGonads === undefined) {
      questionContent = (
        <QuestionStep 
          title="Khám lâm sàng"
          question="Có sờ thấy tuyến sinh dục không? (Palpable gonads)"
          options={[
            { label: 'Có (Yes)', value: true },
            { label: 'Không (No)', value: false }
          ]}
          onSelect={(val) => updateInput('palpableGonads', val)}
        />
      );
    } else if (inputs.mullerianStructure === undefined) {
      questionContent = (
        <QuestionStep 
          title="Siêu âm / Hình ảnh"
          question="Có cấu trúc Müllerian không? (Tử cung, vòi trứng...)"
          options={[
            { label: 'Có (Yes)', value: true },
            { label: 'Không (No)', value: false }
          ]}
          onSelect={(val) => updateInput('mullerianStructure', val)}
        />
      );
    } else if (inputs.palpableGonads === true) {
      // Branch A
      if (inputs.mullerianStructure === true) {
        if (inputs.genitalAsymmetry === undefined) {
          questionContent = (
            <QuestionStep 
              title="Khám lâm sàng"
              question="Có bất đối xứng sinh dục không? (Genital asymmetry)"
              options={[
                { label: 'Có (Yes)', value: true },
                { label: 'Không (No)', value: false }
              ]}
              onSelect={(val) => updateInput('genitalAsymmetry', val)}
            />
          );
        } else if (inputs.genitalAsymmetry === false && inputs.amh === undefined) {
          questionContent = (
            <InputStep 
              title="Xét nghiệm cận lâm sàng"
              question="Nồng độ AMH (ng/mL)"
              placeholder="VD: 15.5"
              onConfirm={(val) => updateInput('amh', parseFloat(val))}
            />
          );
        }
      } else {
        // Müllerian No
        if (inputs.testosterone === undefined) {
          questionContent = (
            <InputStep 
              title="Xét nghiệm cận lâm sàng"
              question="Nồng độ Testosterone (ng/dL)"
              placeholder="VD: 120"
              onConfirm={(val) => updateInput('testosterone', parseFloat(val))}
            />
          );
        } else if (inputs.saltStatus === undefined) {
          questionContent = (
            <QuestionStep 
              title="Điện giải & Chuyển hóa"
              question="Tình trạng điện giải / Muối (Salt status)"
              options={[
                { label: 'Bình thường (Normal)', value: 'Normal' },
                { label: 'Mất muối (Salt wasting)', value: 'SaltWasting' },
                { label: 'Hạ Kali máu (Hypokalemia)', value: 'Hypokalemia' }
              ]}
              onSelect={(val) => updateInput('saltStatus', val)}
            />
          );
        } else if (inputs.testosterone >= 100 && inputs.saltStatus === 'Normal' && inputs.testoDhtRatio === undefined) {
          questionContent = (
            <InputStep 
              title="Xét nghiệm cận lâm sàng"
              question="Tỷ lệ Testosterone : DHT"
              placeholder="VD: 12"
              onConfirm={(val) => updateInput('testoDhtRatio', parseFloat(val))}
            />
          );
        }
      }
    } else {
      // Branch B (Palpable No)
      if (inputs.mullerianStructure === false) {
        if (inputs.amh === undefined) {
          questionContent = (
            <QuestionStep 
              title="Xét nghiệm cận lâm sàng"
              question="Nồng độ AMH (ng/mL)"
              options={[
                { label: 'Không phát hiện được (Undetectable)', value: 0 },
                { label: 'Có phát hiện được', value: 1 } // Simplified for logic
              ]}
              onSelect={(val) => updateInput('amh', val)}
            />
          );
        }
      } else {
        // Müllerian Yes
        if (inputs.maternalVirilisation === undefined) {
          questionContent = (
            <QuestionStep 
              title="Tiền sử"
              question="Mẹ có bị nam hóa khi mang thai không? (Maternal virilisation)"
              options={[
                { label: 'Có (Yes)', value: true },
                { label: 'Không (No)', value: false }
              ]}
              onSelect={(val) => updateInput('maternalVirilisation', val)}
            />
          );
        } else if (inputs.maternalVirilisation === false) {
          if (inputs.seventeenOHP === undefined) {
            questionContent = (
              <InputStep 
                title="Xét nghiệm cận lâm sàng"
                question="Nồng độ 17-OHP (ng/mL)"
                placeholder="VD: 35"
                onConfirm={(val) => updateInput('seventeenOHP', parseFloat(val))}
              />
            );
          } else if (inputs.seventeenOHP >= 10 && inputs.saltStatus === undefined) {
            questionContent = (
              <QuestionStep 
                title="Điện giải & Chuyển hóa"
                question="Tình trạng điện giải / Muối (Salt status)"
                options={[
                  { label: 'Bình thường (Normal)', value: 'Normal' },
                  { label: 'Mất muối (Salt wasting)', value: 'SaltWasting' },
                  { label: 'Hạ Kali máu (Hypokalemia)', value: 'Hypokalemia' }
                ]}
                onSelect={(val) => updateInput('saltStatus', val)}
              />
            );
          }
        }
      }
    }

    // If we have a diagnosis, move to result step
    if (diagnosis && state.step !== 'result') {
      setState(prev => ({ ...prev, step: 'result' }));
      return null;
    }

    return (
      <div className="max-w-xl mx-auto py-8 px-6">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={reset}
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium"
          >
            <RotateCcw size={16} /> Làm lại
          </button>
          <div className="h-2 flex-1 mx-6 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(Object.keys(inputs).length / 6) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={Object.keys(inputs).length}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {questionContent}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const renderResult = () => {
    if (!diagnosis) return null;

    return (
      <div className="max-w-2xl mx-auto py-8 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center mb-10">
            <motion.div 
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="inline-flex p-5 bg-rose-100 text-rose-500 rounded-3xl mb-6 shadow-lg shadow-rose-50"
            >
              <Microscope size={40} />
            </motion.div>
            <h2 className="text-sm font-black text-rose-500 uppercase tracking-[0.2em] mb-2">Kết quả chẩn đoán</h2>
            <h1 className="text-4xl font-black text-slate-900 mb-2">{diagnosis.name}</h1>
            <p className="text-xl text-slate-500 font-semibold">{diagnosis.fullName}</p>
          </div>

          <div className="grid gap-6 mb-10">
            <Card className="p-8 border-none bg-white shadow-xl shadow-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <h3 className="font-black text-slate-900 text-xl mb-4 flex items-center gap-3">
                <div className="p-2 bg-rose-500 text-white rounded-xl"><Info size={20} /></div> 
                Diễn giải chẩn đoán
              </h3>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{diagnosis.description}</p>
              
              <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Activity size={18} className="text-rose-500" /> Tại sao nghĩ tới chẩn đoán này?
                </h4>
                <p className="text-slate-600 leading-relaxed italic">"{diagnosis.reasoning}"</p>
              </div>
            </Card>

            {diagnosis.isEmergency && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="p-8 bg-red-500 text-white rounded-3xl shadow-xl shadow-red-100 flex gap-6 items-start"
              >
                <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h3 className="font-black text-xl mb-2">CẢNH BÁO CẤP CỨU!</h3>
                  <p className="text-red-50 leading-relaxed font-medium">{diagnosis.emergencyNote || 'Cần can thiệp y tế khẩn cấp ngay lập tức.'}</p>
                </div>
              </motion.div>
            )}

            <Card className="p-8 border-none bg-sky-50 shadow-xl shadow-sky-50">
              <h3 className="font-black text-slate-900 text-xl mb-6 flex items-center gap-3">
                <div className="p-2 bg-sky-500 text-white rounded-xl"><Dna size={20} /></div> 
                Các bước tiếp theo nên làm
              </h3>
              <div className="grid gap-3">
                {diagnosis.suggestedEvaluations.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center p-4 bg-white rounded-2xl shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-black text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={reset} variant="outline" className="flex-1 py-5 rounded-3xl border-2 hover:bg-slate-50 text-lg">
              <RotateCcw size={20} /> Đánh giá ca mới
            </Button>
            <Button onClick={() => window.print()} variant="secondary" className="flex-1 py-5 rounded-3xl bg-slate-900 text-lg">
              <ClipboardCheck size={20} /> Lưu & In báo cáo
            </Button>
          </div>

          <div className="mt-16 text-center text-xs text-slate-400 font-bold tracking-widest uppercase">
            DSD Dr. Son 1.0 • Phiên bản dành cho chuyên gia nhi khoa
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-slate-900 selection:bg-rose-100">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-11 h-11 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
              <Stethoscope size={22} />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight block leading-none">DSD Dr. Son</span>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Version 1.0</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-rose-500 transition-colors">Tài liệu</a>
            <a href="#" className="hover:text-rose-500 transition-colors">Liên hệ</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {state.step === 'landing' && renderLanding()}
        {state.step === 'questionnaire' && renderQuestionnaire()}
        {state.step === 'result' && renderResult()}
      </main>

      {/* Footer Disclaimer */}
      {state.step !== 'landing' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 py-3 px-6 text-[10px] text-slate-400 text-center uppercase tracking-widest">
          Chỉ dùng cho mục đích tham khảo lâm sàng • Không thay thế chẩn đoán chuyên khoa
        </footer>
      )}
    </div>
  );
}

// --- Sub-components for Questionnaire ---

function QuestionStep({ 
  title, 
  question, 
  options, 
  onSelect 
}: { 
  title: string, 
  question: string, 
  options: { label: string, value: any }[], 
  onSelect: (val: any) => void 
}) {
  const infoKey = Object.keys(CLINICAL_INFO).find(key => question.toLowerCase().includes(key.toLowerCase()) || title.toLowerCase().includes(key.toLowerCase())) || 
                  (question.includes("tuyến sinh dục") ? "palpableGonads" : 
                   question.includes("Müllerian") ? "mullerianStructure" : 
                   question.includes("AMH") ? "amh" : 
                   question.includes("nam hóa") ? "maternalVirilisation" : "");

  const info = infoKey ? CLINICAL_INFO[infoKey] : null;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-rose-500 font-black text-xs uppercase tracking-[0.2em] mb-3">{title}</h3>
        <h2 className="text-3xl font-black text-slate-900 mb-6 leading-tight">{question}</h2>
        
        {info && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white rounded-3xl border-2 border-slate-50 shadow-sm mb-8"
          >
            <div className="flex items-center gap-3 mb-3 text-slate-800 font-bold">
              <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg"><Info size={16} /></div>
              Kiến thức lâm sàng:
            </div>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">{info.description}</p>
            <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-1">Hướng dẫn khám/xét nghiệm:</span>
              {info.howTo}
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid gap-4">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(opt.value)}
            className="w-full p-6 text-left bg-white border-2 border-slate-50 rounded-3xl hover:border-rose-500 hover:bg-rose-50 transition-all group flex items-center justify-between shadow-sm hover:shadow-rose-100"
          >
            <span className="font-bold text-lg text-slate-700 group-hover:text-rose-700">{opt.label}</span>
            <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-colors">
              <ChevronRight size={20} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InputStep({ 
  title, 
  question, 
  placeholder, 
  onConfirm 
}: { 
  title: string, 
  question: string, 
  placeholder: string, 
  onConfirm: (val: string) => void 
}) {
  const infoKey = question.includes("AMH") ? "amh" : 
                  question.includes("Testosterone") ? "testosterone" : 
                  question.includes("17-OHP") ? "seventeenOHP" : "";
  const info = infoKey ? CLINICAL_INFO[infoKey] : null;

  const [value, setValue] = useState('');

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-rose-500 font-black text-xs uppercase tracking-[0.2em] mb-3">{title}</h3>
        <h2 className="text-3xl font-black text-slate-900 mb-6 leading-tight">{question}</h2>

        {info && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white rounded-3xl border-2 border-slate-50 shadow-sm mb-8"
          >
            <div className="flex items-center gap-3 mb-3 text-slate-800 font-bold">
              <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg"><Info size={16} /></div>
              Kiến thức lâm sàng:
            </div>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">{info.description}</p>
            <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-1">Giá trị tham chiếu:</span>
              {info.howTo}
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-6">
        <div className="relative">
          <input 
            type="number"
            step="any"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full p-8 bg-white border-2 border-slate-100 rounded-3xl text-3xl font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all placeholder:text-slate-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value) onConfirm(value);
            }}
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-lg">
            {question.includes("ng/mL") ? "ng/mL" : question.includes("ng/dL") ? "ng/dL" : ""}
          </div>
        </div>
        <Button 
          onClick={() => onConfirm(value)} 
          disabled={!value}
          className="w-full py-6 rounded-3xl text-xl bg-rose-500 hover:bg-rose-600"
        >
          Xác nhận chỉ số
        </Button>
      </div>
    </div>
  );
}
