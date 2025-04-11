import GoogleLoginButton from "./GoogleLoginButton";
import TermsFooter from "./TermsFooter";

export default function RightPanel() {
  return (
    <div className="w-full md:w-1/2 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h3 className="font-rem foreground text-2xl font-bold mb-2 text-center">
          Autenticação
        </h3>

        <p className="text-muted-foreground text-sm mb-8 text-center">
          Entre com seu e-mail institucional para<br />acessar a plataforma
        </p>

        {/* Botão de login com Google */}
        <GoogleLoginButton />

        {/* Rodapé com termos */}
        <TermsFooter />
      </div>
    </div>
  );
}
