import React, { useState, useEffect } from "react";
import InputField from "./inputField";
import Alarm from "../assets/audio/alarm.mp3";

function Timer({ isOverlay }) {
    const [isEditing, setEditing] = useState(true);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const alert = new Audio(Alarm);

    useEffect(() => {
        let interval;
        if (isActive) {
            interval = setInterval(() => {
                //countdown logic
                if (seconds > 0) {
                    setSeconds((seconds) => seconds - 1);
                } else {
                    if (minutes == 0 && hours == 0) {
                        //audio alert
                        alert.play();
                        clearInterval(interval);
                        setIsActive(false);
                    } else {
                        if (minutes == 0) {
                            setHours((hours) => hours - 1);
                            setMinutes(59);

                        } else {
                            setMinutes((minutes) => minutes - 1);
                        }
                        setSeconds(59);
                    }
                }
            }, 1000)
        } else {
            clearInterval(interval);

        }
        return () => clearInterval(interval);

    }, [isActive, hours, minutes, seconds])

    return (
        <div>
            {isEditing ? (

                <div className="flex justify-center">
                    <div className="justify-center items-center">
                        {/* timer settings */}
                        <InputField label="Hours" value={hours} onChange={(e) => setHours(parseInt(e.target.value))} placeholder="Enter hours" />
                        <InputField label="Minutes" value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value))} placeholder="Enter minutes" />
                        <InputField label="Seconds" value={seconds} onChange={(e) => setSeconds(parseInt(e.target.value))} placeholder="Enter seconds" />
                        <button className="bg-blue-500 text-stone-200 px-20 py-1 rounded-xl text-xl mt-1 ml-1" onClick={() => setEditing(false)}>&#10004;</button>

                    </div>

                </div>
            ) : (
                //timer countdown
                <div>
                    <div className="flex justify-center">
                        <h1 className="text-green-500 text-6xl">
                            {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
                        </h1>
                    </div>
                    <div id="timer-buttons" className="text-stone-500 flex justify-center bg-black/30" >
                        {isActive ? (
                            <>
                                <button className=" cursor-pointer text-5xl text-yellow-500 m-2 " onClick={() => setIsActive(false)}>||</button>
                                <button className=" cursor-pointer text-5xl text-red-500 m-2 " onClick={() => { setIsActive(false); setHours(0); setMinutes(0); setSeconds(0) }}>&#9632;</button>
                            </>

                        ) :
                            <>
                                <button className="Start cursor-pointer text-5xl text-green-500 m-2 " onClick={() => { setIsActive(true) }}>&#9658;</button>
                                <button className=" cursor-pointer text-4xl text-yellow-500 m-2" onClick={() => setEditing(true)}>&#9998;</button>
                            </>
                        }


                    </div>
                </div>
            )}
        </div>
    )
}
export default Timer;
