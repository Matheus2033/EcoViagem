package com.ecoviagem.service;

import com.ecoviagem.dto.ReservaRequest;
import com.ecoviagem.repository.ReservaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ReservaService {

    private final ReservaRepository reservas;

    public ReservaService(ReservaRepository reservas) {
        this.reservas = reservas;
    }

    public Map<String, Object> criar(ReservaRequest req) {
        int id = reservas.inserir(req.idUsuario(), req.idHospedagem(), req.idViagem(),
                req.dataCheckin(), req.dataCheckout(), req.hospedesOuUm());
        return reservas.buscarResumo(id);
    }

    public List<Map<String, Object>> listarPorUsuario(int idUsuario) {
        return reservas.listarPorUsuario(idUsuario);
    }
}
