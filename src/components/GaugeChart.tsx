'use client'
import ReactSpeedometer from "react-d3-speedometer"

interface Props {
  value: number;
}

export default function CustomGauge({ value }: Props) {
  // Garantimos que o valor seja um número entre 0 e 100
  const cleanValue = Math.min(Math.max(Number(value) || 0, 0), 100);

  return (
    <div className="flex justify-center items-center w-full h-full">
      <ReactSpeedometer
        maxValue={100}
        minValue={0}
        value={cleanValue}
        needleColor="red"
        needleHeightRatio={0.8} // Contração do ponteiro
        
        segments={4}
        segmentColors={[
          "#10b94e", // Para 4 cores: 0-25, 50, 75, 
          "#87c522", //  Para 3 cores: 0-33%: Verde (Início)
          "#eab308", // 33-66%: Laranja (Meio)
          "#ef4444"  // 66-100%: Vermelho (Fim)
        ]}
        ringWidth={10}
        currentValueText={`${cleanValue.toFixed(1)}%`} // formatar com 1 casa decimal e adicionar o % 
        valueTextFontSize="14px" // Estilo do texto que fica embaixo da agulha
        textColor="#475569" // Um cinza escuro elegante
        labelFontSize="0"  // Esconde os números da escala nas pontas (0 e 100) para não poluir
        
        // Dimensões
        width={200}
        height={130}
        
        // Animação suave
        needleTransitionDuration={2000}
        //needleTransition="easeElastic"
        forceRender={true}
      />
    </div>
  );
}