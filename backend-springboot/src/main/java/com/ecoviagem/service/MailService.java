package com.ecoviagem.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Envio de e-mail. Só envia de verdade quando app.mail.enabled=true E há um
 * JavaMailSender configurado (spring.mail.*). Caso contrário, retorna false e o
 * chamador entra em "modo demonstração" (devolve o código na resposta da API).
 */
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> senderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean habilitado;

    @Value("${app.mail.from:EcoViagem <no-reply@ecoviagem.local>}")
    private String remetente;

    public MailService(ObjectProvider<JavaMailSender> senderProvider) {
        this.senderProvider = senderProvider;
    }

    public boolean habilitado() {
        return habilitado && senderProvider.getIfAvailable() != null;
    }

    /** Tenta enviar; devolve true se o e-mail foi realmente despachado. */
    public boolean enviar(String para, String assunto, String corpo) {
        JavaMailSender sender = senderProvider.getIfAvailable();
        if (!habilitado || sender == null) return false;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(para);
            msg.setSubject(assunto);
            msg.setText(corpo);
            msg.setFrom(remetente);
            sender.send(msg);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
