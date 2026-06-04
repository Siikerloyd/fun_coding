import React from "react";
function InputField({ label, value, onChange, placeHolder }) {
    const handleInput = (e) => {
        var regex = /^\d+$/;
        if (regex.test(e.target.value)) {
            const numValue = parseInt(e.target.value);
            
            // Validation rules
            if (label === "Minutes" && numValue > 59) {
                return; // Don't update if minutes > 59
            }
            if (label === "Seconds" && numValue > 59) {
                return; // Don't update if seconds > 59
            }
            // Hours have no limit
            
            onChange(e);
        }
    }
    
    return (
        <div className="text-3xl">
            <label className="text-stone-500 text-white">{label}:</label>
            <input
                type="number"
                value={value}
                onChange={handleInput}
                placeholder={placeHolder}
                className="w-20 bg-transparent text-blue-400" />
        </div>
    )
}
export default InputField;
