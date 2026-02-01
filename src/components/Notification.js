import getNotification from 'react-push-notification'
// import './Notification.css'
import { useEffect } from 'react'

const Notification = ({title,message}) => {
    
    
      const handelNotification = () =>{
        getNotification({
            title:title,
            message : message,
            duration : 5000,
            native:true,
            
        })
        
      }

      useEffect(()=>{
        handelNotification()
        console.log("Notification Sent...")
      },[]) 
  
    return (
      <> 
    {/*  <div className='notification-wrapper'>

         <button className='notify-button' onClick={handelNotification}>Notify</button>
        
     </div> */}
        
    </>  
  )
}

export default Notification