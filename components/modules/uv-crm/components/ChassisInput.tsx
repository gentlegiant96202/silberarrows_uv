import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (val:string)=>void;
}

export default function ChassisInput({ value, onChange }: Props){
  const inputs = Array.from({ length: 17 });
  const refs = useRef<HTMLInputElement[]>([]);

  const handleKey = (idx:number, e:React.KeyboardEvent<HTMLInputElement>)=>{
    const key = e.key;
    if(key==='Backspace' && !e.currentTarget.value && idx>0){
      refs.current[idx-1]?.focus();
    }
  };

  const handleChange=(idx:number, e:React.ChangeEvent<HTMLInputElement>)=>{
    let chars = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(!chars){
      const curr=value.split('');curr[idx]='';onChange(curr.join('').padEnd(17,'').slice(0,17));return;
    }
    const curr = value.split('').concat(Array(17).fill('')).slice(0,17);
    for(let i=0;i<chars.length && idx+i<17;i++){
      curr[idx+i]=chars[i];
    }
    onChange(curr.join('').padEnd(17,'').slice(0,17));
    const nextIdx = Math.min(idx+chars.length,16);
    refs.current[nextIdx]?.focus();
  };

  return (
    <div className="flex gap-0.5" onPaste={e=>{
      const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,17);
      if(text){ onChange(text.padEnd(17,'')); }
      e.preventDefault();
    }}>
      {inputs.map((_,i)=>(
        <input
          key={i}
          ref={el=>{ if(el) refs.current[i]=el; }}
          value={value[i]||''}
          onKeyDown={e=>handleKey(i,e)}
          onChange={e=>handleChange(i,e)}
          maxLength={1}
          className={`w-5 h-8 text-center uppercase bg-black/25 border border-white/20 rounded text-white text-xs focus:outline-none ${((i+1)%4===0 && i!==16)?'mr-1':''}`}
        />
      ))}
    </div>
  );
} 