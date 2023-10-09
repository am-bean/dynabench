import React, { FC, useState } from "react";
import Modal from "react-bootstrap/Modal";

type SignContractProps = {
  handleClose: () => void;
};

const SignContract: FC<SignContractProps> = ({ handleClose }) => {
  const [checkboxDisabled, setCheckboxDisabled] = useState(true);
  const handleScroll = (e: any) => {
    const element = e.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      setCheckboxDisabled(false);
    }
  };

  return (
    <div className="p-4 rounded-lg">
      <Modal.Header closeButton>
        <Modal.Title className="text-2xl font-bold text-letter-color">
          Consent
        </Modal.Title>
      </Modal.Header>
      <Modal.Body onScroll={handleScroll}>
        <div className="overflow-auto max-h-64" onScroll={handleScroll}>
          <p className="text-sm text-letter-color">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas id
            velit ut velit dictum hendrerit. Fusce tincidunt lorem at velit
            feugiat, id egestas felis facilisis. Nulla facilisi. Pellentesque
            habitant morbi tristique senectus et netus et malesuada fames ac
            turpis egestas. Vivamus nec libero eget tellus feugiat blandit.
            Nulla sagittis felis a dolor consectetur consequat. Maecenas
            consectetur, libero a tincidunt blandit, orci lectus vulputate
            tortor, ut auctor dolor ex et nisl. Sed et euismod mi, a efficitur
            est. Sed eu convallis eros, eget posuere odio. Nam vitae elit nec ex
            tempus rhoncus. Nulla facilisi. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Maecenas id velit ut velit dictum
            hendrerit. Fusce tincidunt lorem at velit feugiat, id egestas felis
            facilisis. Nulla facilisi. Pellentesque habitant morbi tristique
            senectus et netus et malesuada fames ac turpis egestas. Vivamus nec
            libero eget tellus feugiat blandit. Nulla sagittis felis a dolor
            consectetur consequat. Maecenas consectetur, libero a tincidunt
            blandit, orci lectus vulputate tortor, ut auctor dolor ex et nisl.
            Sed et euismod mi, a efficitur est. Sed eu convallis eros, eget
            posuere odio. Nam vitae elit nec ex tempus rhoncus. Nulla facilisi.
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas id
            velit ut velit dictum hendrerit. Fusce tincidunt lorem at velit
            feugiat, id egestas felis facilisis. Nulla facilisi. Pellentesque
            habitant morbi tristique senectus et netus et malesuada fames ac
            turpis egestas. Vivamus nec libero eget tellus feugiat blandit.
            Nulla sagittis felis a dolor consectetur consequat. Maecenas
            consectetur, libero a tincidunt blandit, orci lectus vulputate
            tortor, ut auctor dolor ex et nisl. Sed et euismod mi, a efficitur
            est. Sed eu convallis eros, eget posuere odio. Nam vitae elit nec ex
            tempus rhoncus. Nulla facilisi. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Maecenas id velit ut velit dictum
            hendrerit. Fusce tincidunt lorem at velit feugiat, id egestas felis
            facilisis. Nulla facilisi. Pellentesque habitant morbi tristique
            senectus et netus et malesuada fames ac turpis egestas. Vivamus nec
            libero eget tellus feugiat blandit. Nulla sagittis felis a dolor
            consectetur consequat. Maecenas consectetur, libero a tincidunt
            blandit, orci lectus vulputate tortor, ut auctor dolor ex et nisl.
            Sed et euismod mi, a efficitur est. Sed eu convallis eros, eget
            posuere odio. Nam vitae elit nec ex tempus rhoncus. Nulla facilisi.
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="my-3 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            disabled={checkboxDisabled}
            onClick={handleClose}
          />
          <label className="form-check-label text-letter-color">
            I agree to the terms and conditions
          </label>
        </div>
      </Modal.Footer>
    </div>
  );
};

export default SignContract;
