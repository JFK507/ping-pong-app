import { C } from '../../constants/colors';
import { STAGES } from '../../constants/config';
import { Eyebrow } from '../../components/Eyebrow';

export function Stepper({ stage }) {
  const i = STAGES.findIndex(([k]) => k === stage);
  return (
    <div style={{ padding: '10px 16px 4px' }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {STAGES.map(([k], j) => (
          <div key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: j < i ? C.red : j === i ? C.gold : C.line }} />
        ))}
      </div>
      <Eyebrow color={C.gold}>{STAGES[i]?.[1]}</Eyebrow>
    </div>
  );
}
