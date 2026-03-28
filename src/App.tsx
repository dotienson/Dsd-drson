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
  Dna,
  Lock
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
    title: "Sờ tuyến sinh dục (Palpable Gonads)",
    description: "Sự hiện diện của tuyến sinh dục sờ thấy được ở ống bẹn hoặc nếp môi bìu có giá trị dự đoán cao về mô tinh hoàn.",
    howTo: "Cách khám: Sờ dọc ống bẹn và bìu/môi lớn. Ghi nhận vị trí, kích thước, mật độ."
  },
  mullerianStructure: {
    title: "Cấu trúc Müllerian (Müllerian Structures)",
    description: "Sự vắng mặt của các cấu trúc Müllerian cho thấy sự hiện diện của Anti-Müllerian Hormone (AMH) được tiết ra bởi các tế bào Sertoli của thai nhi đang hoạt động.",
    howTo: "Chẩn đoán: Siêu âm ổ bụng/vùng chậu hoặc MRI để xác định tử cung."
  },
  amh: {
    title: "Xét nghiệm AMH (Anti-Müllerian Hormone)",
    description: "AMH huyết thanh là một dấu ấn có độ nhạy và độ đặc hiệu cao đối với mô tinh hoàn ở bệnh nhân DSD trước tuổi dậy thì.",
    howTo: "Tham chiếu: AMH > 10 ng/mL gợi ý mô tinh hoàn hoạt động. AMH không phát hiện được gợi ý Anorchia hoặc XX DSD."
  },
  testosterone: {
    title: "Xét nghiệm Testosterone",
    description: "Nồng độ testosterone cơ bản hoặc sau kích thích bằng hCG giúp đánh giá chức năng tế bào Leydig và quá trình sinh tổng hợp androgen.",
    howTo: "Tham chiếu: Đỉnh sơ sinh (mini-puberty) Testosterone > 100 ng/dL. Thấp hơn gợi ý khiếm khuyết sinh tổng hợp hoặc loạn sản."
  },
  seventeenOHP: {
    title: "Xét nghiệm 17-OHP",
    description: "17-OHP tăng cao là dấu ấn chẩn đoán chính cho thiếu hụt 21-hydroxylase, nguyên nhân phổ biến nhất của CAH.",
    howTo: "Tham chiếu: > 30 ng/mL chẩn đoán 21-OHD. Lấy máu sau 48h tuổi."
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
  'POR': 'Thiếu hụt P450 oxidoreductase',
  'SW': 'Dạng mất muối',
  'SV': 'Dạng nam hóa đơn thuần',
};

// --- Helper Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-50 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  className = "",
  type = "button"
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger',
  disabled?: boolean,
  className?: string,
  type?: "button" | "submit" | "reset"
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-100',
    outline: 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-red-100',
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 shadow-lg ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  const [state, setState] = useState<AppState>({
    step: 'landing',
    inputs: {},
    history: [],
  });
  const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.toLowerCase() === 'dotienson') {
      setIsAuthenticated(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const reset = () => {
    setState({
      step: 'landing',
      inputs: {},
      history: [],
    });
    setIsDisclaimerAccepted(false);
  };

  const startQuestionnaire = () => {
    setState(prev => ({ ...prev, step: 'questionnaire' }));
  };

  const updateInput = (key: keyof AppState['inputs'], value: any) => {
    setState(prev => {
      const newHistory = [...prev.history, JSON.stringify(prev.inputs)];
      return {
        ...prev,
        history: newHistory,
        inputs: { ...prev.inputs, [key]: value }
      };
    });
  };

  const goBack = () => {
    setState(prev => {
      if (prev.history.length === 0) {
        return { ...prev, step: 'landing', inputs: {}, history: [] };
      }
      const newHistory = [...prev.history];
      const lastInputsStr = newHistory.pop();
      const lastInputs = lastInputsStr ? JSON.parse(lastInputsStr) : {};
      
      return {
        ...prev,
        step: 'questionnaire',
        history: newHistory,
        inputs: lastInputs
      };
    });
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
            fullName: 'Ovotesticular DSD (Rối loạn phát triển giới tính dạng Ovotesticular)',
            description: 'Có sự hiện diện của cả mô tinh hoàn và mô buồng trứng trên cùng một cá thể.',
            reasoning: 'Vì sờ thấy tuyến sinh dục (có mô tinh hoàn) nhưng lại có cấu trúc Müllerian (tử cung) và biểu hiện bất đối xứng, gợi ý sự phát triển không đồng nhất của hai bên tuyến sinh dục.',
            suggestedEvaluations: ['Xét nghiệm Di truyền (Karyotype)', 'Sinh thiết tuyến sinh dục', 'Siêu âm ổ bụng chuyên sâu'],
          };
        } else if (inputs.genitalAsymmetry === false && inputs.amh !== undefined) {
          if (inputs.amh < 10) {
            return {
              name: 'Dysgenesis',
              fullName: 'Dysgenesis (Loạn sản tuyến sinh dục)',
              description: 'Tuyến sinh dục phát triển không hoàn thiện.',
              reasoning: 'Sờ thấy tuyến sinh dục nhưng có tử cung và AMH thấp (<10), chứng tỏ mô tinh hoàn hiện diện nhưng chức năng tiết AMH bị suy giảm nặng do loạn sản.',
              suggestedEvaluations: ['Xét nghiệm Di truyền (Karyotype)', 'Đánh giá chức năng tuyến sinh dục'],
            };
          } else {
            return {
              name: 'AMH resistance',
              fullName: 'AMH resistance (Kháng AMH)',
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
              name: '3BHSD, StAR, hoặc SCC',
              fullName: 'Khiếm khuyết sinh tổng hợp Steroid sớm (3BHSD, StAR, SCC)',
              description: 'Thiếu hụt các enzyme quan trọng trong quá trình tạo hormone steroid từ cholesterol.',
              reasoning: 'Bệnh nhân kiểu hình nam (không tử cung) nhưng Testosterone thấp và có tình trạng mất muối, gợi ý khiếm khuyết enzyme ảnh hưởng đến cả vỏ thượng thận và tuyến sinh dục.',
              suggestedEvaluations: ['Định lượng các tiền chất steroid', 'Xét nghiệm gen tương ứng'],
              isEmergency: true,
              emergencyNote: 'Nguy cơ cơn mất muối cấp. Cần theo dõi sát điện giải và điều trị bù dịch/hormone kịp thời.',
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
              name: 'Khiếm khuyết Isolated',
              fullName: 'Khiếm khuyết Isolated (Đơn độc)',
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
          } else if (inputs.saltStatus !== 'SaltWasting' && inputs.testoDhtRatio !== undefined) {
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
            fullName: 'Anorchia (Không có tinh hoàn)',
            description: 'Tinh hoàn bị thoái triển hoàn toàn trong quá trình bào thai.',
            reasoning: 'Không sờ thấy tuyến sinh dục, không có tử cung (chứng tỏ AMH từng hiện diện để làm thoái triển ống Muller) nhưng hiện tại AMH không phát hiện được, gợi ý tinh hoàn đã biến mất sau giai đoạn biệt hóa ban đầu.',
            suggestedEvaluations: ['Thử nghiệm kích thích hCG', 'Nội soi thăm dò nếu cần'],
          };
        }
      } else if (inputs.mullerianStructure === true) {
        if (inputs.maternalVirilisation === true) {
          return {
            name: 'Aromatase / POR',
            fullName: 'Aromatase / POR (Thiếu hụt Aromatase hoặc POR)',
            description: 'Rối loạn chuyển đổi androgen thành estrogen, ảnh hưởng cả mẹ và thai nhi.',
            reasoning: 'Sự nam hóa của cả mẹ và con gợi ý một khối u tiết androgen hoặc phổ biến hơn là thiếu hụt enzyme chuyển đổi androgen thành estrogen (Aromatase).',
            suggestedEvaluations: ['Định lượng Estrogen', 'Xét nghiệm gen CYP19A1 hoặc POR'],
          };
        } else if (inputs.maternalVirilisation === false && inputs.seventeenOHP !== undefined) {
          if (inputs.seventeenOHP > 30) {
            if (inputs.saltStatus === undefined) return null;
            
            if (inputs.saltStatus === 'Hypokalemia') {
              return {
                name: '11OHD',
                fullName: ABBREVIATIONS['11OHD'],
                description: 'Thiếu hụt enzyme 11-beta-hydroxylase, gây nam hóa và cao huyết áp.',
                reasoning: '17-OHP tăng rất cao kèm hạ Kali máu gợi ý sự tích tụ DOC gây giữ muối, đặc trưng của thiếu hụt 11-beta-hydroxylase.',
                suggestedEvaluations: ['Định lượng 11-deoxycortisol', 'Đo huyết áp'],
              };
            } else if (inputs.saltStatus === 'SaltWasting') {
              return {
                name: '21OHD (SW)',
                fullName: `${ABBREVIATIONS['21OHD']} - ${ABBREVIATIONS['SW']}`,
                description: 'Dạng phổ biến nhất của tăng sản thượng thận bẩm sinh (CAH), thể mất muối.',
                reasoning: 'Nồng độ 17-OHP rất cao (>30) kèm mất muối lâm sàng là tiêu chuẩn vàng để chẩn đoán thiếu hụt 21-hydroxylase thể mất muối.',
                suggestedEvaluations: ['Xét nghiệm gen CYP21A2', 'Theo dõi điện giải đồ'],
                isEmergency: true,
                emergencyNote: 'Tình trạng cấp cứu khẩn cấp: rối loạn điện giải và suy thượng thận cấp nguy hiểm tính mạng!',
              };
            } else {
              return {
                name: '21OHD (Chưa loại trừ SW)',
                fullName: `${ABBREVIATIONS['21OHD']} - Có thể là SV hoặc SW giai đoạn sớm`,
                description: 'Tăng sản thượng thận bẩm sinh. Điện giải hiện tại bình thường nhưng chưa thể loại trừ cơn mất muối xảy ra muộn hơn.',
                reasoning: 'Nồng độ 17-OHP rất cao (>30) chẩn đoán 21OHD. Điện giải bình thường có thể do bệnh nhân ở thể SV, hoặc thể SW nhưng chưa bước vào cơn suy thượng thận cấp (thường xảy ra vào tuần 1-2 sau sinh).',
                suggestedEvaluations: ['Xét nghiệm gen CYP21A2', 'Theo dõi sát điện giải đồ trong những tuần đầu'],
                isEmergency: false,
                emergencyNote: 'Cần theo dõi sát điện giải đồ đề phòng cơn mất muối cấp.',
              };
            }
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
                name: 'SV 21OHD (Chưa loại trừ SW)',
                fullName: `${ABBREVIATIONS['21OHD']} - ${ABBREVIATIONS['SV']} (Cần theo dõi SW)`,
                description: 'Tăng sản thượng thận bẩm sinh dạng nam hóa đơn thuần. Tuy nhiên chưa thể loại trừ hoàn toàn thể mất muối giai đoạn sớm.',
                reasoning: '17-OHP tăng mức độ trung bình và điện giải bình thường hướng tới dạng nam hóa đơn thuần của thiếu hụt 21-hydroxylase, nhưng vẫn cần theo dõi nguy cơ mất muối.',
                suggestedEvaluations: ['Xét nghiệm gen CYP21A2', 'Theo dõi sát điện giải đồ'],
                isEmergency: false,
                emergencyNote: 'Cần theo dõi sát điện giải đồ đề phòng cơn mất muối cấp.',
              };
            }
          } else if (inputs.seventeenOHP < 10) {
            return {
              name: 'Genetics',
              fullName: 'Genetics (Khuyên làm xét nghiệm Di truyền)',
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
    <div className="max-w-2xl mx-auto py-10 sm:py-16 px-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 sm:mb-10 inline-flex p-5 sm:p-8 bg-blue-50 rounded-2xl text-blue-600 shadow-xl shadow-blue-100"
      >
        <Stethoscope size={56} className="sm:w-20 sm:h-20 w-14 h-14" />
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-4xl sm:text-6xl font-extrabold text-slate-900 mb-4 sm:mb-6 tracking-tight"
      >
        DSD Dr. Son <span className="text-blue-600">1.0</span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg sm:text-2xl text-slate-600 mb-10 sm:mb-14 leading-relaxed font-medium"
      >
        Lưu đồ tiếp cận bất thường phát triển giới tính (DSD) cho bác sĩ nhi - sơ sinh
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:gap-6 mb-10 sm:mb-16 text-left"
      >
        <Card className="p-5 sm:p-6 flex gap-4 sm:gap-5 items-start">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base sm:text-xl">Hướng dẫn từng bước</h3>
            <p className="text-sm sm:text-lg text-slate-500">Các câu hỏi sẽ hiện ra linh hoạt dựa trên dữ liệu lâm sàng bạn cung cấp.</p>
          </div>
        </Card>
        <Card className="p-5 sm:p-6 flex gap-4 sm:gap-5 items-start">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base sm:text-xl">Cảnh báo cấp cứu</h3>
            <p className="text-sm sm:text-lg text-slate-500">Nhận diện sớm các tình trạng nguy hiểm như cơn mất muối cấp.</p>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8 sm:mb-10 flex items-center justify-center gap-3 sm:gap-4"
      >
        <input 
          type="checkbox" 
          id="disclaimer" 
          checked={isDisclaimerAccepted}
          onChange={(e) => setIsDisclaimerAccepted(e.target.checked)}
          className="w-5 h-5 sm:w-6 sm:h-6 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
        />
        <label htmlFor="disclaimer" className="text-sm sm:text-lg font-medium text-slate-700 cursor-pointer select-none">
          Chỉ sử dụng với mục đích tham khảo lâm sàng
        </label>
      </motion.div>

      <Button onClick={startQuestionnaire} disabled={!isDisclaimerAccepted} className="w-full sm:w-auto px-10 sm:px-16 py-4 sm:py-5 text-lg sm:text-xl">
        Bắt đầu đánh giá <ChevronRight size={24} />
      </Button>

      <div className="mt-10 sm:mt-16 p-4 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-500 italic text-left">
        <div className="flex gap-2 mb-2 text-slate-700 font-semibold not-italic">
          <Info size={16} /> Miễn trừ trách nhiệm:
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
          question="Có sờ thấy tuyến sinh dục không?"
          options={[
            { label: 'Có', value: true },
            { label: 'Không', value: false }
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
            { label: 'Có', value: true },
            { label: 'Không', value: false }
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
              question="Có bất đối xứng sinh dục không?"
              options={[
                { label: 'Có', value: true },
                { label: 'Không', value: false }
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
              question="Tình trạng điện giải / Muối"
              options={[
                { label: 'Bình thường', value: 'Normal' },
                { label: 'Mất muối', value: 'SaltWasting' },
                { label: 'Hạ Kali máu', value: 'Hypokalemia' }
              ]}
              onSelect={(val) => updateInput('saltStatus', val)}
            />
          );
        } else if (inputs.testosterone >= 100 && inputs.saltStatus !== 'SaltWasting' && inputs.testoDhtRatio === undefined) {
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
                { label: 'Không phát hiện được', value: 0 },
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
              question="Mẹ có bị nam hóa khi mang thai không?"
              options={[
                { label: 'Có', value: true },
                { label: 'Không', value: false }
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
                question="Tình trạng điện giải / Muối"
                options={[
                  { label: 'Bình thường', value: 'Normal' },
                  { label: 'Mất muối', value: 'SaltWasting' },
                  { label: 'Hạ Kali máu', value: 'Hypokalemia' }
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
      <div className="max-w-xl mx-auto py-6 px-4 sm:py-8 sm:px-6">
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <button 
            onClick={goBack}
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium"
          >
            <ChevronLeft size={16} /> Quay lại
          </button>
          <div className="h-2 flex-1 mx-6 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(Object.keys(inputs).length / 6) * 100}%` }}
            />
          </div>
          <button 
            onClick={reset}
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium"
          >
            <RotateCcw size={16} /> Làm lại
          </button>
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
      <div className="max-w-2xl mx-auto py-8 px-6 sm:py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center mb-8 sm:mb-12">
            <motion.div 
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="inline-flex p-5 sm:p-6 bg-blue-50 text-blue-600 rounded-2xl mb-6 sm:mb-8 shadow-lg shadow-blue-100/50"
            >
              <Microscope size={40} className="sm:w-12 sm:h-12" />
            </motion.div>
            <h2 className="text-sm sm:text-base font-bold text-blue-600 uppercase tracking-[0.2em] mb-3">Chẩn đoán cần nghĩ đến</h2>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-3">{diagnosis.name}</h1>
            <p className="text-lg sm:text-2xl text-slate-500 font-semibold">{diagnosis.fullName}</p>
          </div>

          <div className="grid gap-6 sm:gap-8 mb-8 sm:mb-12">
            <Card className="p-6 sm:p-10 border-none bg-white shadow-xl shadow-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-blue-50 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 opacity-50"></div>
              <h3 className="font-bold text-slate-900 text-xl sm:text-2xl mb-4 sm:mb-5 flex items-center gap-3 sm:gap-4">
                <div className="p-2 bg-blue-600 text-white rounded-lg"><Info size={20} className="sm:w-6 sm:h-6" /></div> 
                Diễn giải chẩn đoán
              </h3>
              <p className="text-slate-600 text-lg sm:text-xl leading-relaxed mb-6 sm:mb-8">{diagnosis.description}</p>
              
              <div className="p-5 sm:p-8 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-blue-600 sm:w-[22px] sm:h-[22px]" /> Tại sao nghĩ tới chẩn đoán này?
                </h4>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed italic">"{diagnosis.reasoning}"</p>
              </div>
            </Card>

            {diagnosis.isEmergency && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="p-6 sm:p-10 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-100 flex gap-5 sm:gap-8 items-start"
              >
                <div className="p-3 sm:p-4 bg-white/20 rounded-2xl shrink-0">
                  <AlertTriangle size={32} className="sm:w-10 sm:h-10" />
                </div>
                <div>
                  <h3 className="font-bold text-xl sm:text-2xl mb-2 sm:mb-3">CẢNH BÁO CẤP CỨU!</h3>
                  <p className="text-red-50 text-base sm:text-lg leading-relaxed font-medium">{diagnosis.emergencyNote || 'Cần can thiệp y tế khẩn cấp ngay lập tức.'}</p>
                </div>
              </motion.div>
            )}

            <Card className="p-6 sm:p-10 border-none bg-indigo-50 shadow-xl shadow-indigo-50">
              <h3 className="font-bold text-slate-900 text-xl sm:text-2xl mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
                <div className="p-2 bg-indigo-600 text-white rounded-xl"><Dna size={20} className="sm:w-6 sm:h-6" /></div> 
                Các bước tiếp theo nên làm
              </h3>
              <div className="grid gap-3 sm:gap-4">
                {diagnosis.suggestedEvaluations.map((item, idx) => (
                  <div key={idx} className="flex gap-4 sm:gap-5 items-center p-4 sm:p-5 bg-white rounded-2xl shadow-sm">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-base sm:text-lg text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Button onClick={reset} variant="outline" className="flex-1 py-4 sm:py-6 rounded-xl border-2 hover:bg-slate-50 text-lg sm:text-xl">
              <RotateCcw size={24} /> Đánh giá ca mới
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-200">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Mã bảo vệ</h1>
            <p className="text-slate-500 text-sm sm:text-base">Vui lòng nhập mã để truy cập ứng dụng</p>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-6">
            <div>
              <input 
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Nhập mã tại đây..."
                autoFocus
                className={`w-full p-4 sm:p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-bold focus:outline-none transition-all ${
                  passcodeError ? 'border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-100 focus:border-blue-600 focus:ring-4 focus:ring-blue-100'
                }`}
              />
              {passcodeError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm font-bold mt-3 text-center"
                >
                  Mã bảo vệ không chính xác!
                </motion.p>
              )}
            </div>
            <Button type="submit" className="w-full py-4 rounded-2xl text-lg bg-blue-600 hover:bg-blue-700">
              Truy cập ngay
            </Button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-[0.2em] font-bold">
              DSD Dr. Son • Bảo mật nội bộ
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
              <Stethoscope size={18} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <span className="font-bold text-lg sm:text-xl tracking-tight block leading-none">DSD Dr. Son</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Tài liệu</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Liên hệ</a>
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
          Chỉ dùng cho mục đích tham khảo lâm sàng
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
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h3 className="text-blue-600 font-bold text-xs sm:text-sm uppercase tracking-[0.2em] mb-2 sm:mb-3">{title}</h3>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">{question}</h2>
        
        {info && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-sm mb-5 sm:mb-6"
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3 text-slate-800 font-bold text-sm sm:text-base">
              <div className="p-1 bg-blue-50 text-blue-600 rounded-md"><Info size={14} className="sm:w-[16px] sm:h-[16px]" /></div>
              Kiến thức lâm sàng:
            </div>
            <p className="text-slate-600 text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed">{info.description}</p>
            <div className="p-3 sm:p-4 bg-slate-50 rounded-xl text-xs sm:text-sm text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-1">Hướng dẫn khám/xét nghiệm:</span>
              {info.howTo}
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(opt.value)}
            className="w-full p-4 sm:p-5 text-left bg-white border border-slate-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all group flex items-center justify-between shadow-sm hover:shadow-blue-100/50"
          >
            <span className="font-bold text-lg sm:text-xl text-slate-700 group-hover:text-blue-700">{opt.label}</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <ChevronRight size={20} className="sm:w-[22px] sm:h-[22px]" />
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
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h3 className="text-blue-600 font-bold text-xs sm:text-sm uppercase tracking-[0.2em] mb-2 sm:mb-3">{title}</h3>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">{question}</h2>

        {info && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-sm mb-5 sm:mb-6"
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3 text-slate-800 font-bold text-sm sm:text-base">
              <div className="p-1 bg-blue-50 text-blue-600 rounded-md"><Info size={14} className="sm:w-[16px] sm:h-[16px]" /></div>
              Kiến thức lâm sàng:
            </div>
            <p className="text-slate-600 text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed">{info.description}</p>
            <div className="p-3 sm:p-4 bg-slate-50 rounded-xl text-xs sm:text-sm text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-1">Giá trị tham chiếu:</span>
              {info.howTo}
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-4 sm:space-y-5">
        <div className="relative">
          <input 
            type="number"
            step="any"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full p-5 sm:p-8 bg-white border-2 border-slate-200 rounded-xl text-2xl sm:text-4xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder:text-slate-300"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value) onConfirm(value);
            }}
          />
          <div className="absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-base sm:text-xl">
            {question.includes("ng/mL") ? "ng/mL" : question.includes("ng/dL") ? "ng/dL" : ""}
          </div>
        </div>
        <Button 
          onClick={() => onConfirm(value)} 
          disabled={!value}
          className="w-full py-4 sm:py-6 rounded-xl text-lg sm:text-xl bg-blue-600 hover:bg-blue-700"
        >
          Xác nhận chỉ số
        </Button>
      </div>
    </div>
  );
}
