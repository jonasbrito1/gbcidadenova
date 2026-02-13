import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaEye, FaEdit, FaUserGraduate, FaTrash, FaBan, FaCheckCircle } from 'react-icons/fa';

const ActionsMenu = ({
  student,
  onView,
  onEdit,
  onGraduations,
  onToggleStatus,
  onDelete,
  hasAdminAccess
}) => {
  const iconStyle = {
    fontSize: '1rem',
    fontWeight: 'bold'
  };

  const buttonStyle = {
    padding: '0.4rem 0.6rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    minHeight: '32px'
  };

  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap' }}>
      {/* Ver */}
      <OverlayTrigger placement="top" overlay={<Tooltip>Visualizar</Tooltip>}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onView(student)}
          style={buttonStyle}
        >
          <FaEye style={iconStyle} />
        </Button>
      </OverlayTrigger>

      {hasAdminAccess && (
        <>
          {/* Editar */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Editar</Tooltip>}>
            <Button
              variant="warning"
              size="sm"
              onClick={() => onEdit(student)}
              style={buttonStyle}
            >
              <FaEdit style={iconStyle} />
            </Button>
          </OverlayTrigger>

          {/* Graduações */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Graduações</Tooltip>}>
            <Button
              variant="info"
              size="sm"
              onClick={() => onGraduations(student)}
              style={buttonStyle}
            >
              <FaUserGraduate style={iconStyle} />
            </Button>
          </OverlayTrigger>

          {/* Inativar/Reativar */}
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>{student.status === 'ativo' ? 'Inativar' : 'Reativar'}</Tooltip>}
          >
            <Button
              variant={student.status === 'ativo' ? 'secondary' : 'success'}
              size="sm"
              onClick={() => onToggleStatus(student.id, student.nome, student.status)}
              style={buttonStyle}
            >
              {student.status === 'ativo' ? <FaBan style={iconStyle} /> : <FaCheckCircle style={iconStyle} />}
            </Button>
          </OverlayTrigger>

          {/* Excluir */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Excluir</Tooltip>}>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(student.id, student.nome)}
              style={buttonStyle}
            >
              <FaTrash style={iconStyle} />
            </Button>
          </OverlayTrigger>
        </>
      )}
    </div>
  );
};

export default ActionsMenu;
