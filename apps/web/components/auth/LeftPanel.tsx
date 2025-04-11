import Logo from "@/public/logo.svg";

export default function LeftPanel() {
  return (
    <div className="md:flex md:w-1/2 m-8 rounded bg-primary relative overflow-hidden p-12 flex-col justify-between bg-[linear-gradient(180deg,_#2563EB_0%,_#3B82F6_100%)]">
      <div className="relative z-10">
        <h1 className="font-rem text-secondary font-extrabold text-[64px] leading-[72px] tracking-normal">
          Tecnologia de
          <br />
          eventos ao seu
          <br />
          alcance
        </h1>
      </div>

      <div className="relative z-10 mt-8">
        <Logo className="w-[139.828125px] h-[33.5390625px] gap-[11.39px]" />

        <p className="font-hanken-grotesk font-normal text-[12px] leading-none tracking-normal text-secondary text-sm opacity-80 mt-4">
          Copyright 2025 verifIC. Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
