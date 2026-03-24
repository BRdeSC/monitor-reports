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
        startColor="#22c55e" // Verde
        endColor="#f10814ce"   // Vermelho
        segments={4}
        ringWidth={10}
        
        // --- ARREDONDAMENTO E TEXTO ---
        // Aqui dizemos para o D3 formatar com 1 casa decimal e adicionar o %
        currentValueText={`${cleanValue.toFixed(1)}%`} 
        
        // Estilo do texto que fica embaixo da agulha
        valueTextFontSize="14px"
        valueTextColor="#475569" // Um cinza escuro elegante
        
        // Esconde os números da escala nas pontas (0 e 100) para não poluir
        labelFontSize="0" 
        
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